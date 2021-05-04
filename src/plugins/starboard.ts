import { Message, MessageReaction, TextChannel, User } from "discord.js";
import { CommandoGuild, CommandoMessage } from "discord.js-commando";
import { DArgumentType, DArgument, DCommand, DCommandGroup, DEntitlement, BaseDPlugin, DEvent, DPlugin, author, description, embed, footer, image } from "discord-botkit";

const star_reaction = "⭐";

interface StarStorage {
    count: number;
    messageID: string;
    channelID: string;
}

async function makeStarboardDescriptor(reaction: MessageReaction) {
    reaction = reaction.partial ? await reaction.fetch() : reaction;
    const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
    const embedImage = message.attachments.find(a => a.height !== null);

    return embed(
        author(message.member?.displayName || message.author.username, message.author.avatarURL() || undefined),
        description(message.content),
        embedImage ? image(embedImage.url) : [],
        footer(`⭐️ ${reaction.count}`)
    );
}

@DPlugin("starboard")
@DCommandGroup("starboard")
export class Starboard extends BaseDPlugin {
    @DEvent("messageReactionAdd")
    async onReactionAdd(reaction: MessageReaction, user: User) {
        if (user.id === user.client.user?.id) return;
        if (reaction.emoji.name !== star_reaction) return;
        
        const starboard = await this.starboard(reaction.message.guild as CommandoGuild);
        
        if (!starboard) return;

        const storage = await this.storageForMessage(reaction.message);

        if (storage) {
            if (reaction.count !== null) storage.count = reaction.count;
            const existing = await starboard.messages.fetch(storage.messageID);
            await existing.edit(await makeStarboardDescriptor(reaction));
        } else {
            const message = await starboard.send(await makeStarboardDescriptor(reaction));
            await this.storageForMessage(reaction.message, {
                count: reaction.count || 0,
                messageID: message.id,
                channelID: message.channel.id
            });
        }
    }

    @DEvent("messageReactionRemove")
    async onReactionRemove(reaction: MessageReaction, user: User) {
        if (user.id === user.client.user?.id) return;
        if (reaction.emoji.name !== star_reaction) return;

        const storage = await this.storageForMessage(reaction.message);

        if (storage) {
            if (!reaction.count) {
                await this.unset(`star-storage:${reaction.message.id}`);
                await (reaction.message.guild?.channels.resolve(storage.channelID) as TextChannel)?.messages.delete(storage.messageID);
            } else {
                const existing = await (reaction.message.guild?.channels.resolve(storage.channelID) as TextChannel)?.messages.fetch(storage.messageID);
                await existing.edit(await makeStarboardDescriptor(reaction));
            }
        }
    }

    @DCommand("starchan", "Sets the star channel")
    @DArgument({ key: "channel", type: DArgumentType.textChannel })
    @DEntitlement("manage-starboard", { permissionSubstitutes: ["MANAGE_CHANNELS"] })
    async setStarboard(message: CommandoMessage, { channel }: { channel: TextChannel }) {
        await this.starboard(message.guild, channel);
        await message.react("🆗");
    }

    private async storageForMessage(message: Message, storage?: StarStorage): Promise<StarStorage | undefined> {
        if (storage) await this.set(`star-storage:${message.id}`, storage);
        return this.get(`star-storage:${message.id}`);
    }

    private async starboard(guild: CommandoGuild, newChannel?: TextChannel) {
        if (newChannel) {
            await guild.settings.set("starboard", newChannel.id);
        }

        const starboardID = await guild.settings.get("starboard");

        console.log(starboardID);

        const channel = guild.channels.resolve(starboardID);
        if (!channel?.isText()) return null;

        return channel;
    }
}
