import { FileOptions, GuildMember, Message, MessageAttachment, MessageEmbed, User } from "discord.js";

type DeclarativeEmbedFn = ((embed: MessageEmbed) => MessageEmbed) | null

type DeclarativeEmbed = DeclarativeEmbedFn | DeclarativeEmbed[]

export const field = (name: string, value?: string, inline?: boolean): DeclarativeEmbed => (embed: MessageEmbed) => value ? embed.addField(name, value, inline) : embed;
export const title = (title: string): DeclarativeEmbed => embed => embed.setTitle(title);
export const description = (desc: string): DeclarativeEmbed => embed => embed.setDescription(desc);
export const author = (name: string, iconURL?: string, url?: string): DeclarativeEmbed => embed => embed.setAuthor(name, iconURL, url);
export const footer = (text: string, iconURL?: string): DeclarativeEmbed => embed => embed.setFooter(text, iconURL);
export const image = (url: string): DeclarativeEmbed => embed => embed.setImage(url);
export const attachments = (attachments: (string | MessageAttachment | FileOptions)[]): DeclarativeEmbed => embed => embed.attachFiles(attachments);

export function embed(...parts: DeclarativeEmbed[]): MessageEmbed {
    const embed = new MessageEmbed();

    function apply(declaratives: DeclarativeEmbed[]) {
        declaratives.forEach(declaration => declaration ? Array.isArray(declaration) ? apply(declaration) : declaration(embed) : undefined);
    }

    apply(parts);

    return embed;
}

export function signature(user: User | GuildMember | Message): DeclarativeEmbed {
    if (user instanceof Message) user = user.member || user.author;
    const dUser = user instanceof GuildMember ? user.user : user;
    const name = user instanceof GuildMember ? (user.nickname || user.displayName) : user.username;

    return embed => embed.setFooter(name, dUser.avatarURL() || undefined);
}

export function error(desc: string) {
    return [
        title("Marvin Error"),
        description(desc)
    ];
}