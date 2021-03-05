import { CommandoMessage } from "discord.js-commando";
import GuildPreferences from "../../db/entities/GuildPreferences";
import { DArgumentType } from "../util/argument-type";
import { parseCode } from "../util/code-analysis";
import { DArgument, DCommand, DCommandGroup, DefineEntitlement } from "../util/declarative-commands";
import { BaseDPlugin, DPlugin } from "../util/declarative-plugins";

function makeCode(lang: string, code: string): string {
    return `\`\`\`${lang}\n${code}\n\`\`\``;
}

function jsonOrString(raw: string): any {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

const ManageDefaultsEntitlement = DefineEntitlement("manage-defaults", { permissionSubstitutes: ["ADMINISTRATOR"] });

@DPlugin("defaults")
@DCommandGroup("defaults")
export class DefaultsManager extends BaseDPlugin {
    @DCommand("defaults-write", "Sets a default value for this guild")
    @ManageDefaultsEntitlement()
    @DArgument({ key: "key", type: DArgumentType.string })
    @DArgument({ key: "value", type: DArgumentType.string })
    async writeDefaults(message: CommandoMessage, { key, value }: { key: string, value: string }) {
        const { code } = parseCode(value);
        
        await message.guild.settings.set(key, jsonOrString(code));
        await message.react("🆗");
    }

    @DCommand("defaults-read", "Sets a default value for this guild")
    @ManageDefaultsEntitlement()
    @DArgument({ key: "key", type: DArgumentType.string })
    async readDefaults(message: CommandoMessage, { key }: { key: string }) {
        const value = await message.guild.settings.get(key);
        
        await message.reply(makeCode("json", JSON.stringify({ [key]: value }, undefined, 4)));
    }

    @DCommand("defaults-delete", "Deletes a default value for this guild")
    @ManageDefaultsEntitlement()
    @DArgument({ key: "key", type: DArgumentType.string })
    async deleteDefaults(message: CommandoMessage, { key }: { key: string }) {
        await message.guild.settings.remove(key);
        await message.react("🆗");
    }

    @DCommand("defaults-list", "Sets a default value for this guild")
    @ManageDefaultsEntitlement()
    async listDefaults(message: CommandoMessage) {
        const preferences = await GuildPreferences.resolve(message.guild);
        
        await message.reply(makeCode("json", JSON.stringify(preferences?.preferences || {}, undefined, 4)));
    }
}