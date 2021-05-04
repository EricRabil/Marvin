import { ActivityType, PresenceData } from "discord.js";
import { CommandoMessage } from "discord.js-commando";
import { parseCode, BaseDPlugin, DPlugin, DPluginLoaded, DCommand, DCommandGroup, DefineEntitlement } from "discord-botkit";

const ActivityTypes: ActivityType[] = ["PLAYING", "STREAMING", "LISTENING", "WATCHING", "CUSTOM_STATUS", "COMPETING"];

const BotPresenceEntitlement = DefineEntitlement("set-bot-presence");

@DPlugin("bot-status")
@DCommandGroup("bot-status")
export class BotStatus extends BaseDPlugin {
    @DCommand("set-activity", "Sets the activity of the bot.")
    @BotPresenceEntitlement()
    async setStatus(message: CommandoMessage, status: string) {
        const existing = await this.presenceData();

        if (!existing.activity) existing.activity = {};
        existing.activity.name = status;

        await this.presenceData(existing);
        await Promise.all([
            message.react("🆗"),
            this.updateStatus()
        ]);
    }

    @DCommand("set-activity-type", "Sets the activity-type of the bot.")
    @BotPresenceEntitlement()
    async setActivityType(message: CommandoMessage, type: string) {
        type = type.toUpperCase();

        const existing = await this.presenceData();

        if (!existing.activity) existing.activity = {};
        if (!ActivityTypes.includes(type as ActivityType)) {
            await message.reply("Sorry, that's not a valid activity type.");
            return;
        }

        existing.activity.type = type as ActivityType;

        await this.presenceData(existing);
        await Promise.all([
            message.react("🆗"),
            this.updateStatus()
        ]);
    }

    @DCommand("unsafe-overwrite-activity", "Overwrites the presence data for the bot.")
    @BotPresenceEntitlement()
    async overwriteActivity(message: CommandoMessage, rawJSON: string) {
        const { code } = parseCode(rawJSON);
        let parsed: PresenceData;

        try {
            parsed = JSON.parse(code);
        } catch {
            await message.reply("Sorry, thaht's an invalid JSON string.");
            return;
        }
        await this.presenceData(parsed);
        await Promise.all([
            message.react("🆗"),
            this.updateStatus()
        ]);
    }

    @DPluginLoaded
    async updateStatus() {
        this.client.user?.setPresence(await this.presenceData());
    }

    private async presenceData(updated?: PresenceData): Promise<PresenceData> {
        if (updated) await this.set("presence-data", updated);
        return await this.get("presence-data") || {};
    }
}