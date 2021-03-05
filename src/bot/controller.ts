import "./commando-devs-are-pedantic-fucks";
import { Client } from "discord.js-commando";
import { GeneralComands } from "./commands/general";
import PostgresSettingsProvider from "./psql-setting-provider";
import { compileCommandGroup, CompiledCommandGroup } from "./util/declarative-commands";
import { DebugCommands } from "./commands/debug";
import { Starboard } from "./plugins/starboard";
import { compilePlugin } from "./util/declarative-plugins";
import { Eval } from "./plugins/eval";
import { Entitlements } from "./native/entitlements";
import { DeleteReply } from "./native/delete-reply";
import ERLog from "../util/log";
import { BotStatus } from "./plugins/bot-status";
import { DefaultsManager } from "./native/defaults";

const Log = ERLog("DiscordController");

export default class DiscordController {
    public static shared = new DiscordController();

    public client: Client;

    public entitlements = new Entitlements();

    private constructor() {
        this.client = new Client({
            owner: process.env.BOT_OWNER,
            ws: {
                intents: ["GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGES", "GUILDS"]
            },
            partials: ["MESSAGE", "CHANNEL", "REACTION"]
        });

        this.client.on("debug", console.log);
    }

    public async connect(): Promise<void> {
        this.client.registry.registerDefaultTypes();

        this.client.commandPrefix = "m!";
        await this.client.login(process.env.DISCORD_TOKEN);
        await this.client.setProvider(PostgresSettingsProvider.shared);

        this.load(new GeneralComands());
        this.load(new DebugCommands());

        this.loadPlugin(this.entitlements);
        this.loadPlugin(new DefaultsManager());
        this.loadPlugin(new DeleteReply());

        this.loadPlugin(new Starboard());
        this.loadPlugin(new BotStatus());
        this.loadPlugin(new Eval());
    }

    private async loadPlugin(plugin: any) {
        const { metadata, commandGroups, listeners, hooks, lifecycleHooks } = compilePlugin(plugin);

        commandGroups.forEach(group => this.loadCompiledCommandGroup(group));
        listeners.forEach(({ key, metadata }) => this.client.on(metadata.name, (...args: any[]) => plugin[key](...args)));
        // @ts-ignore(2345)
        hooks.forEach(({ key, metadata }) => Object.entries(metadata).forEach(([ listener, enabled ]) => enabled && this.client.on(`command:${listener}`, (...args: any[]) => plugin[key](...args))));

        await Promise.all(lifecycleHooks.map(async ({ key, metadata }) => {
            if (metadata.loaded) await plugin[key]();
        }));

        Log.info(`Registered plugin ${metadata.id}`);
    }

    private load(commandBlob: any) {
        this.loadCompiledCommandGroup(compileCommandGroup(commandBlob));
    }

    private loadCompiledCommandGroup({ group, commands }: CompiledCommandGroup) {
        this.client.registry.registerGroup(group(this.client));
        this.client.registry.registerCommands(commands);
    }
}