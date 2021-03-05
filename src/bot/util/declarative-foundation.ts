import { GuildMember, User } from "discord.js";
import DiscordController from "../controller";
import { CompiledEntitlement } from "./declarative-commands";

export class BaseDObject {
    isEntitled(user: GuildMember | User, id: string | CompiledEntitlement): Promise<boolean> {
        return DiscordController.shared.entitlements.isUserEntitled(user, id);
    }

    async queryEntitlements(user: GuildMember | User, entitlements: (string | CompiledEntitlement)[]): Promise<Record<string, boolean>> {
        return await DiscordController.shared.entitlements.testEntitlements(user, entitlements);
    }
    
    public get client() {
        return DiscordController.shared.client;
    }
}