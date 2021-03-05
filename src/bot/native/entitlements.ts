import { GuildMember, User } from "discord.js";
import { CommandoMessage } from "discord.js-commando";
import { inspect } from "util";
import { DArgumentType } from "../util/argument-type";
import { CompiledEntitlement, DArgument, DCommand, DCommandGroup, DEntitlement, EntitlementMetadata } from "../util/declarative-commands";
import { BaseDPlugin, DPlugin } from "../util/declarative-plugins";

function testPermissionSubstitutes(ent: EntitlementMetadata, member: GuildMember | User) {
    if (member instanceof User) return false;
    if (!ent.permissionSubstitutes?.length) return false;
    switch (ent.resolutionStrategy) {
        case "any":
            return ent.permissionSubstitutes.some(perm => member.hasPermission(perm));
        case "all":
        default:
            return ent.permissionSubstitutes.every(perm => member.hasPermission(perm));
    }
}

@DPlugin("entitlements")
@DCommandGroup("entitlements")
export class Entitlements extends BaseDPlugin {
    @DCommand("grant", "Grants an entitlement to a user")
    @DEntitlement("manage-entitlements")
    @DArgument({ key: "user", type: DArgumentType.user })
    @DArgument({ key: "id", type: DArgumentType.string })
    async grant(message: CommandoMessage, args: { user: User, id: string }) {
        return this.setEntitledUI(message, { ...args, state: true });
    }

    @DCommand("revoke", "Revokes an entitlement from a user")
    @DEntitlement("manage-entitlements")
    @DArgument({ key: "user", type: DArgumentType.user })
    @DArgument({ key: "id", type: DArgumentType.string })
    revoke(message: CommandoMessage, args: { user: User, id: string }) {
        return this.setEntitledUI(message, { ...args, state: false });
    }

    @DCommand("entitlements", "Gets entitlements for a user")
    @DEntitlement("manage-entitlements")
    @DArgument({ key: "user", type: DArgumentType.user })
    async getEntitlements(message: CommandoMessage, { user }: { user: User }) {
        const ent = await this.entitlements(user);

        await message.reply(`\`\`\`js\n${inspect(ent, false, 2, false)}\n\`\`\``);
    }

    private async setEntitledUI(message: CommandoMessage, { user, id, state }: { user: User, id: string, state: boolean }) {
        await this.setEntitled(user, id, state);

        await message.react("🆗");
    }

    private async setEntitled(user: User, id: string, entitled: boolean) {
        const ent = await this.entitlements(user);

        await this.entitlements(user, {
            ...ent,
            [id]: entitled
        });
    }

    public async isUserEntitled(user: GuildMember | User, entitlement: string | CompiledEntitlement) {
        return this.testEntitlements(user, [entitlement]).then(res => Object.values(res)[0] || false);
    }

    public async testEntitlements(user: GuildMember | User, entitlements: (string | CompiledEntitlement)[]) {
        const ent = await this.entitlements(user);

        return Object.fromEntries(entitlements.map(entitlement => {
            const id = typeof entitlement === "string" ? entitlement : entitlement.entitlement;
            if (user instanceof GuildMember && typeof entitlement === "object" && testPermissionSubstitutes(entitlement, user)) return [id, true];

            return [id, ent[id] === true];
        }));
    }

    private async entitlements(user: GuildMember | User, updated?: Record<string, boolean>): Promise<Record<string, boolean>> {
        if (user instanceof GuildMember) user = user.user;
        if (this.client.isOwner(user)) return new Proxy((await this.get(user.id)) || {}, {
            get() {
                return true;
            }
        });

        if (updated) await this.set(user.id, updated);
        return updated ? updated : (await this.get(user.id)) || {};
    }
}