import { Message, MessageReaction, TextChannel, User } from "discord.js";
import { CommandoMessage } from "discord.js-commando";
import { BaseDPlugin, DCommandCompleted, DCommandReplied, DEvent, DPlugin, DPluginLoaded } from "../util/declarative-plugins";

interface DeleteContext {
    author: string;
    others?: string[];
    origin?: string;
}

@DPlugin("garbage-collector")
export class DeleteReply extends BaseDPlugin {
    private pendingDeletion: Record<string, Set<string>> = {}

    @DEvent("messageReactionAdd")
    async onReactionAdd(reaction: MessageReaction, user: User) {
        if (reaction.emoji.name !== "🗑️") return;
        
        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        if (reaction.message.author.id !== this.client.user?.id) return;
        user = user.partial ? await user.fetch() : user;

        const context: DeleteContext | undefined = await this.get(message.id);
        if (context?.author === user.id || this.client.isOwner(user)) {
            const deletions = [message.id].concat(context?.others || []);
            if (context?.origin) deletions.push(context.origin);

            this.queueForDeletion(message.channel.id, deletions);

            await this.unset(message.id);
        }
    }

    @DCommandReplied
    associateReply(message: Message | Message[], origin: CommandoMessage) {
        return this.associate(message, origin);
    }

    @DCommandCompleted
    async associate(message: Message | Message[], { author: { id: userID }, id: origin }: CommandoMessage) {

        message = Array.isArray(message) ? message : [message];

        const lastMessage = message[message.length - 1];

        if (!lastMessage) return;

        if (lastMessage instanceof CommandoMessage) {
            if ((await lastMessage.guild.settings.get("gc-disabled")) === true) return;
        }

        const associatedMessages = message.slice(0, message.length - 1).map(m => m.id);

        await Promise.all([
            lastMessage.react("🗑️"),
            this.set(lastMessage.id, {
                author: userID,
                origin,
                others: associatedMessages
            })
        ]);
    }

    @DPluginLoaded
    async runDeletions() {
        const deletions = Object.entries(this.pendingDeletion);
        this.pendingDeletion = {};
        
        for (const [ channelID, messages ] of deletions) {
            const messagesArray = Array.from(messages);
            for (let i = 0; i < messagesArray.length; i += 100) {
                const toDelete = messagesArray.slice(i, i + 100);
                if (!toDelete.length) continue;

                await (await this.client.channels.fetch(channelID) as TextChannel).bulkDelete(toDelete);
            }
        }

        setTimeout(() => this.runDeletions(), 10 * 1000);
    }

    private queueForDeletion(channel: string, ids: string[]) {
        if (!this.pendingDeletion[channel]) this.pendingDeletion[channel] = new Set();
        ids.forEach(id => this.pendingDeletion[channel].add(id));
    }
}
