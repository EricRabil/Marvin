import { CommandoMessage } from "discord.js-commando";
import { DCommand, DCommandGroup } from "../util/declarative-commands";
import { embed, field, title } from "../util/functional-embeds";

@DCommandGroup("debug")
export class DebugCommands {
    @DCommand("ping", "🏓 does the thing")
    async ping(message: CommandoMessage) {
        const created = message.createdTimestamp;

        const response = (fieldText: string) => embed(
            title("Marvin"),
            field("Pong", fieldText)
        );
        
        const newMessage = await message.channel.send(
            response("Just a sec.")
        );

        const rtt = newMessage.createdTimestamp - created;

        await newMessage.edit(
            response(`${rtt}ms`)
        );

        return newMessage;
    }
}
