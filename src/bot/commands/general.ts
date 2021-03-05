import { GuildMember, User } from "discord.js";
import { Argument as CommandoArgument, Command as CommandoCommand, CommandGroup as CommandoGroup, CommandoClient, CommandoMessage } from "discord.js-commando";
import { has } from "../../util/reflect";
import { DArgumentType } from "../util/argument-type";
import { DArgument, BaseDCommandGroup, DCommand, DCommandGroup, CompiledEntitlement, DEntitlement } from "../util/declarative-commands";
import { embed, field, signature, title } from "../util/functional-embeds";

function commandText(client: CommandoClient, command: CommandoCommand | string) {
    command = typeof command === "string" ? command : command.name;
    return `\`${client.commandPrefix}${command}\``;
}

function argCaps({ default: argDefault }: CommandoArgument): [string, string] {
    return argDefault ? [ "[", "]" ] : [ "<", ">" ];
}

function argString(args: CommandoArgument[]) {
    return args.map(arg => {
        const [ start, end ] = argCaps(arg);

        return `${start}${arg.key}:${arg.type.id}${end}`;
    }).join(" ");
}

@DCommandGroup("general")
export class GeneralComands extends BaseDCommandGroup {
    @DCommand("shit", "shits")
    @DEntitlement("shit")
    async shit(message: CommandoMessage) {
        await message.react("💩");
    }

    @DCommand("help", "Helps you.")
    @DArgument({ key: "command", type: DArgumentType.command, default: "" })
    async help(message: CommandoMessage, { command }: { command: CommandoCommand }): Promise<void> {
        await message.reply(
            embed(
                title("Marvin Help"),
                command ? [
                    field("Command", commandText(this.client, command)),
                    field("Description", command.description || "No description"),
                    field("Usage", command.usage(argString(command.argsCollector.args), this.prefix))
                ] : [
                    await this.generateManpageForUser(message.member || message.author)
                ],
                signature(message)
            )
        );
    }

    private async generateManpageForUser(user: GuildMember | User) {
        const grantedCommands = await this.grantedCommandsForUser(user);
        const groups = this.commandGroups;

        return groups.map(group => {
            const validCommands = group.commands.filter(c => grantedCommands.includes(c.name));

            if (!validCommands) return null;
            return field(group.name, validCommands.map(c => commandText(this.client, c)).join("\n"), true);
        });
    }

    private async grantedCommandsForUser(user: GuildMember | User) {
        const entitlements = this.commandToEntitlements;
        const allEntitlements = Array.from(new Set(Object.values(entitlements).flat()));

        const resolution = await this.queryEntitlements(user, allEntitlements);

        return Object.entries(entitlements).filter(([ , entitlements ]) => entitlements.every(ent => resolution[ent.entitlement] === true)).map(([ command ]) => command);
    }

    get prefix(): string {
        return this.client.commandPrefix;
    }

    get commandGroups(): CommandoGroup[] {
        return Array.from(this.client.registry.groups.values());
    }

    private get allCommands() {
        return this.commandGroups.flatMap(g => Array.from(g.commands.values()));
    }

    private get commandToEntitlements(): Record<string, CompiledEntitlement[]> {
        return this.allCommands.reduce((acc, command) => Object.assign(acc, {
            [command.name]: has(command, "entitlements") ? command.entitlements : []
        }), {});
    }
}
