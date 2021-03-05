import { stripIndents } from "common-tags";
import { Argument as CommandoArgument, CommandoMessage } from "discord.js-commando";
import { embed, error } from "./util/functional-embeds";

const oldReply = CommandoMessage.prototype.reply;
// @ts-ignore
CommandoMessage.prototype.reply = function(content: APIMessageContentResolvable | (MessageOptions & { split?: false }) | MessageAdditions, options: any) {
    if (typeof content === "string" && content.includes("Cancelled command.")) return;
    else return oldReply.call(this, content, options).then(message => {
        this.client.emit("command:onReply", message || [], this);
    });
};

CommandoArgument.prototype.obtain = async function(this: CommandoArgument, msg, val, promptLimit = Infinity) {
    const empty = this.isEmpty(val!, msg);

    if(empty && this.default !== null) {
        return {
            value: typeof this.default === "function" ? await this.default(msg, this) : this.default,
            cancelled: null,
            prompts: [],
            answers: []
        };
    }

    // @ts-ignore
    if(this.infinite) return this.obtainInfinite(msg, val as unknown as string[], promptLimit);

    const valid = !empty ? await this.validate(val!, msg) : false;

    if (!valid || typeof valid === "string") {
        /* eslint-disable no-await-in-loop */
        return {
            value: null,
            cancelled: "yeah",
            prompts: [
                await msg.channel.send(embed(
                    error(stripIndents`
                        ${empty ? this.prompt : valid ? valid : `That's not a invalid \`type:${this.label}\`. Try again.`}
                    `)
                ))
            ],
            answers: []
        };
    }

    return {
        // @ts-ignore
        value: await this.parse(val, msg),
        cancelled: null,
        prompts: [],
        answers: []
    };
} as CommandoArgument["obtain"];