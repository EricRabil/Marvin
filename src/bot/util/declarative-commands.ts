import { Message, PermissionString } from "discord.js";
import { ArgumentCollectorResult, ArgumentInfo, Command as CommandoCommand, CommandGroup as CommandoGroup, CommandInfo, CommandoClient, CommandoMessage } from "discord.js-commando";
import { mergeClass, mergeProperty, Newable } from "../../util/metadata-decorator";
import { enumerateFunctions } from "../../util/object";
import { has } from "../../util/reflect";
import DiscordController from "../controller";
import { BaseDObject } from "./declarative-foundation";
import { list } from "./response-helpers";

const CommandGroupMetadata = Symbol("CommandGroup");
const CommandIdentifier = Symbol("Command");

interface CommandGroupOptions {
    name?: string;
    guarded?: boolean;
}

interface CommandGroupCompiledOptions extends CommandGroupOptions {
    id: string;
}

export interface EntitlementMetadata {
    permissionSubstitutes?: PermissionString[];
    resolutionStrategy?: "all" | "any";
}

export interface CompiledEntitlement extends EntitlementMetadata {
    entitlement: string
}

interface DCommandInfo extends CommandInfo {
    entitlements?: CompiledEntitlement[];
}

export const DCommandGroup = (id: string, opts: {
    name?: string,
    guarded?: boolean
} = {}) => mergeClass(CommandGroupMetadata, {}, {
    id,
    ...opts
});

export function isCommandGroup<T extends Newable>(constructor: T): constructor is T & { [CommandGroupMetadata]: CommandGroupCompiledOptions } {
    return CommandGroupMetadata in constructor;
}

export const DCommand = (name: string, description: string, opts: Omit<DCommandInfo, "name" | "group" | "memberName" | "description"> = {}) => (
    mergeProperty(CommandIdentifier, {}, {
        name,
        description,
        memberName: name,
        prompt: "",
        ...opts
    })
);

export const DArgument = (arg: Omit<ArgumentInfo, "prompt">) => mergeProperty<DCommandInfo>(CommandIdentifier, {}, storage => ({
    args: storage.args ? [Object.assign({}, arg, { prompt: "" }), ...storage.args] : [Object.assign({}, arg, { prompt: "" })]
}));

export const DEntitlement = (entitlement: string, meta: EntitlementMetadata = {}) => mergeProperty<DCommandInfo>(CommandIdentifier, {}, storage => ({
    entitlements: storage.entitlements ? [{ entitlement, ...meta }, ...storage.entitlements] : [{ entitlement, ...meta }]
}));

export const DefineEntitlement = (entitlement: string, meta: EntitlementMetadata = {}) => () => DEntitlement(entitlement, meta);

export interface CompiledCommandGroup {
    group: (client: CommandoClient) => CommandoGroup,
    commands: (typeof CommandoCommand)[]
}

export class BaseDCommandGroup extends BaseDObject {
}

function createPermissionDescriptor(ent: EntitlementMetadata): string {
    const sep = ent.resolutionStrategy === "any" ? "OR" : "AND";

    const descriptor = ent.permissionSubstitutes?.join(` ${sep} `);
    if (descriptor) return ` (satisfied by perms: ${descriptor})`;
    else return "";
}

export function compileCommandGroup<T extends { constructor: Function }>(clazz: T): CompiledCommandGroup {
    if (!has(clazz.constructor, CommandGroupMetadata)) throw new Error("Class is not a command group.");
    const metadata: CommandGroupCompiledOptions = clazz.constructor[CommandGroupMetadata] as unknown as CommandGroupCompiledOptions;

    const allCommands: Record<keyof T, DCommandInfo> = {} as Record<keyof T, DCommandInfo>;

    enumerateFunctions(clazz, (key, fn) => {
        if (has(fn, CommandIdentifier)) {
            allCommands[key] = fn[CommandIdentifier] as DCommandInfo;
        }
    });

    const compiled = Object.entries(allCommands).map(([ method, info ]) => class extends CommandoCommand {
        constructor(client: CommandoClient) {
            super(client, {
                ...info,
                group: metadata.id
            });
        }

        async onError(err: Error) {
            console.error(err);

            return [];
        }

        async run(message: CommandoMessage, args: object | string | string[], fromPattern: boolean, result?: ArgumentCollectorResult): Promise<Message | Message[] | null> {
            if (info.entitlements) {
                const entitlementValidation = await Promise.all<[CompiledEntitlement, boolean]>(info.entitlements.map(ent => DiscordController.shared.entitlements.isEntitled(message.member || message.author, ent).then((isEntitled) => [ent, isEntitled])));
                const missing = entitlementValidation.filter(([ , entitled ]) => !entitled).map(([ ent ]) => `${ent.entitlement}${createPermissionDescriptor(ent)}` );
                if (missing.length) {
                    await message.reply(`You're missing the following entitlements: ${list(missing)}`);
                    this.client.emit("command:onDenied" as any, message, info);
                    return null;
                }
            }

            const results = await (clazz[method as keyof T] as unknown as CommandoCommand["run"])(message, args, fromPattern, result);

            // @ts-ignore(2345)
            this.client.emit("command:onComplete", results || [], message);

            return null;
        }

        public get entitlements(): CompiledEntitlement[] {
            return info.entitlements || [];
        }
    });

    return {
        commands: compiled,
        group: (client: CommandoClient) => new CommandoGroup(client, metadata.id, metadata.name, metadata.guarded)
    };
}