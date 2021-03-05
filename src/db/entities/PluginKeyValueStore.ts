import { BaseEntity, Column, Entity, Unique } from "typeorm";
import { createNodeRedisClient } from "handy-redis";

const client = createNodeRedisClient();

@Entity()
@Unique(["plugin", "key"])
export default class PluginKeyValueStore extends BaseEntity {
    @Column({ primary: true })
    plugin: string;

    @Column({ primary: true })
    key: string;

    @Column("json", { default: "{}" })
    value: any;

    public static async get(plugin: string, key: string): Promise<any> {
        // return client.get(`${plugin}:${key}`).then(res => res || this.findOne({ plugin, key }).then(store => store?.value).then(value => ));
        const cached = await client.get(`${plugin}:${key}`);
        if (cached === null) {
            const resolved = await this.findOne({ plugin, key });
            if (resolved) {
                await client.set(`${plugin}:${key}`, JSON.stringify(resolved.value));
            }
            return resolved?.value;
        }
        return JSON.parse(cached);
    }

    public static async set(plugin: string, key: string, value: any) {
        await this.unset(plugin, key);
        await Promise.all([
            this.create({
                plugin,
                key,
                value
            }).save(),
            client.set(`${plugin}:${key}`, JSON.stringify(value))
        ]);
    }

    public static async unset(plugin: string, key: string) {
        await Promise.all([
            this.delete({ plugin, key }),
            client.del(`${plugin}:${key}`)
        ]);
    }
}