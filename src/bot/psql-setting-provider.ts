import { Guild } from "discord.js";
import { SettingProvider } from "discord.js-commando";
import GuildPreferences from "../db/entities/GuildPreferences";

export default class PostgresSettingsProvider extends SettingProvider {
    public static shared = new PostgresSettingsProvider();

    private constructor() {
        super();
    }

    public async clear(guild: string | Guild): Promise<void> {
        const record = await GuildPreferences.resolve(guild);
        if (!record) return;

        record.preferences = {};
        await record.save();
    }

    public async destroy(): Promise<void> {
        return;
    }

    public async get<T>(guild: string | Guild, key: string, defVal?: T): Promise<T | undefined> {
        const record = await GuildPreferences.resolve(guild);

        return (record?.preferences[key] as T) || defVal;
    }

    public async init(): Promise<void> {
        return;
    }

    public async remove(guild: string | Guild, key: string): Promise<unknown> {
        const record = await GuildPreferences.resolve(guild);
        if (!record) return;

        const oldValue = record.preferences[key];
        delete record.preferences[key];

        await record.save();

        return oldValue;
    }

    public async set<T>(guild: string | Guild, key: string, val: any): Promise<T> {
        const record = await GuildPreferences.resolve(guild, true);
        
        record.preferences[key] = val;
        await record.save();

        return val;
    }
}