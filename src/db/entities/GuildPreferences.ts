import { Guild } from "discord.js";
import { BaseEntity, Column, Entity } from "typeorm";

@Entity()
export default class GuildPreferences extends BaseEntity {
    @Column({ unique: true, primary: true })
    id: string;

    @Column("jsonb", { default: "{}" })
    preferences: Record<string, unknown>;

    public static async resolve<T extends boolean>(guild: string | Guild, create?: T): Promise<T extends true ? GuildPreferences : GuildPreferences | undefined> {
        const id = typeof guild === "string" ? guild : guild.id;

        // @ts-ignore
        if (create) return this.findOne({ id }).then(res => res ? res : GuildPreferences.create({ id, preferences: {} }).save());
        // @ts-ignore
        else return this.findOne({ id });
    }
}