import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { Message, User } from "discord.js";
import { CommandoMessage } from "discord.js-commando";
import fs from "fs-extra";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { inspect } from "util";
import { parseCode } from "../util/code-analysis";
import { DCommand, DCommandGroup, DEntitlement } from "../util/declarative-commands";
import { BaseDPlugin, DPlugin } from "../util/declarative-plugins";
import { description, embed, title } from "../util/functional-embeds";

const DEDICATED_JS_RUNNER = resolve(__dirname, "js-runner.js");

function tmpFile(ext: string) {
    return join(tmpdir(),`script.${randomBytes(6).readUIntLE(0,6).toString(36)}.${ext}`);
}

function inspectResult(res: any, depth = 5): string {
    if (depth === -1) return "Result too long";
    const result = inspect(res, false, depth, false);

    if (result.length >= 1900) return inspectResult(res, depth - 1);
    else return result;
}

async function execute(command: string, env: object = {}): Promise<string[]> {
    const child = spawn(command, {
        env: {
            PATH: process.env.PATH,
            ...env
        },
        cwd: "/",
        shell: true
    });

    child.stderr.setEncoding("utf8");
    child.stdout.setEncoding("utf8");

    const output: string[] = [];

    child.stdout.on("data", chunk => output.push(chunk));
    child.stderr.on("data", chunk => output.push(chunk));

    await new Promise(resolve => child.once("close", resolve));

    return output.join("\n").match(/(.|\n){1,1900}/g) || [];
}

async function runCode(bin: string, code: string, ext: string = bin) {
    const tmpName = tmpFile(ext);

    await fs.writeFile(tmpName, code);

    const result = await execute(`${bin} ${tmpName}`);

    await fs.unlink(tmpName);

    return result;
}

async function evaluateJavaScript(code: string, message: CommandoMessage): Promise<string[]> {
    try {
        const client = message.client;
        /* eslint-disable */
        const guilds = client.guilds;
        const channels = client.channels;
        const me = client.user;
        /* eslint-enable */

        const result = await eval(code);

        return [inspectResult(result)];
    } catch (e) {
        return [e.toString()];
    }
}

const runners: Record<string, (code: string, message: CommandoMessage) => Promise<string[]>> = {
    py: code => runCode("python3", code, "py"),
    python: code => runCode("python3", code, "py"),
    php: code => runCode("php", code),
    shit: code => runCode("php", code),
    rb: code => runCode("ruby", code, "rb"),
    ruby: code => runCode("ruby", code, "rb"),
    ts: code => runCode("ts-node", code, "ts"),
    typescript: code => runCode("ts-node", code, "ts"),
    sh: code => runCode("sh", code, "sh"),
    bash: code => runCode("bash", code, "sh"),
    zsh: code => runCode("zsh", code, "sh"),
    go: code => runCode("go run", code, "go"),
    perl: code => runCode("perl", code, "pl"),
    swift: code => runCode("swift", code, "swift"),
    js: code => execute(`node ${DEDICATED_JS_RUNNER}`, { SRC_STRING: code }),
    jsx: (code, message) => evaluateJavaScript(code, message),
    applescript: code => runCode("osascript", code, "scpt")
};

@DPlugin("eval")
@DCommandGroup("eval")
export class Eval extends BaseDPlugin {
    @DCommand("eval", "Evaluates code in a given language")
    @DEntitlement("eval")
    async doEval(message: CommandoMessage, rawCode: string) {
        const { language, code } = parseCode(rawCode);

        async function go(lang: string, runner: (code: string, message: CommandoMessage) => Promise<string[]>, message: CommandoMessage) {
            const status = await message.channel.send(embed(
                title("Processing"),
                description("I'll be done with your code in a jiffy.")
            ));

            const result = (await runner(code, message)).map(res => `\`\`\`${lang}\n${res}\n\`\`\``);

            if (result.length <= 1) {
                await status.edit({
                    content: result[0] || `\`\`\`${lang}\nNo Output\n\`\`\``,
                    embed: null
                });

                return status;
            } else {
                await status.edit({
                    content: "Your results have been sent.",
                    embed: null
                });

                const results: Message[] = [status];

                for (let i = 0; i < result.length; i++) {
                    results.push(await status.channel.send({
                        content: result[i]
                    }));
                }

                return results;
            }
        }

        if (runners[language]) {
            if (!(await this.isEntitledForLanguage(message.author, language))) {
                const [ , reply ] = await Promise.all([
                    message.react("🔪"),
                    message.reply("You're not entitled to that language.")
                ]);
                return reply;
            }

            return await go(language, runners[language], message);
        } else {
            const [ , reply ] = await Promise.all([
                message.react("⁉️"),
                message.reply(`Sorry, that's not a valid language. I have:\`\`\`md\n${Object.keys(runners).map(runner => `- ${runner}`).join("\n")}\`\`\``)
            ]);
            return reply;
        }
    }

    private async isEntitledForLanguage(user: User, language: string) {
        switch (language) {
            case "jsx":
                return this.isEntitled(user, "eval:in-process");
            default:
                return Object.values(await this.queryEntitlements(user, [`eval:${language}`, "eval:*"])).some(bool => bool);
        }
    }
}