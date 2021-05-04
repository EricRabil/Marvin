import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { Message, User } from "discord.js";
import { CommandoMessage } from "discord.js-commando";
import fs from "fs-extra";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { inspect } from "util";
import { parseCode, BaseDPlugin, DPlugin, DCommand, DCommandGroup, DEntitlement, title, embed, description } from "discord-botkit";

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

async function execute(command: string, env: object = {}, stdin?: string): Promise<string[]> {
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

    if (stdin) child.stdin.write(stdin);
    child.stdin.write("\n");

    const output: string[] = [];

    child.stdout.on("data", chunk => output.push(chunk));
    child.stderr.on("data", chunk => output.push(chunk));

    const termination = setTimeout(() => {
        output.push("Terminated due to timeout.");
        child.kill("SIGKILL");
    }, 60000);

    await new Promise(resolve => child.once("close", resolve));

    clearTimeout(termination);

    return output.join("\n").match(/(.|\n){1,1900}/g) || [];
}

async function runCode(bin: string, code: string, ext: string = bin, stdin?: string) {
    const tmpName = tmpFile(ext);

    await fs.writeFile(tmpName, code);

    const result = await execute(`${bin} ${tmpName}`, {}, stdin);

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

const runners: Record<string, (code: string, message: CommandoMessage, stdin?: string) => Promise<string[]>> = {
    py: (code, _, stdin) => runCode("python3", code, "py", stdin),
    python: (code, _, stdin) => runCode("python3", code, "py", stdin),
    php: (code, _, stdin) => runCode("php", code, "php", stdin),
    shit: (code, _, stdin) => runCode("php", code, "php", stdin),
    rb: (code, _, stdin) => runCode("ruby", code, "rb", stdin),
    ruby: (code, _, stdin) => runCode("ruby", code, "rb", stdin),
    ts: (code, _, stdin) => runCode("ts-node", code, "ts", stdin),
    typescript: (code, _, stdin) => runCode("ts-node", code, "ts", stdin),
    sh: (code, _, stdin) => runCode("sh", code, "sh", stdin),
    bash: (code, _, stdin) => runCode("bash", code, "sh", stdin),
    zsh: (code, _, stdin) => runCode("zsh", code, "sh", stdin),
    go: (code, _, stdin) => runCode("go run", code, "go", stdin),
    perl: (code, _, stdin) => runCode("perl", code, "pl", stdin),
    swift: (code, _, stdin) => runCode("swift", code, "swift", stdin),
    js: (code, _, stdin) => execute(`node ${DEDICATED_JS_RUNNER}`, { SRC_STRING: code }, stdin),
    jsx: (code, message) => evaluateJavaScript(code, message),
    applescript: (code, _, stdin) => runCode("osascript", code, "scpt", stdin)
};

@DPlugin("eval")
@DCommandGroup("eval")
export class Eval extends BaseDPlugin {
    @DCommand("eval", "Evaluates code in a given language")
    @DEntitlement("eval")
    async doEval(message: CommandoMessage, rawCode: string) {
        const { language, code, additional: [ stdin ] } = parseCode(rawCode);

        async function go(lang: string, runner: (code: string, message: CommandoMessage, stdin?: string) => Promise<string[]>, message: CommandoMessage) {
            const status = await message.channel.send(embed(
                title("Processing"),
                description("I'll be done with your code in a jiffy.")
            ));

            const result = (await runner(code, message, stdin?.code)).map(res => `\`\`\`${lang}\n${res}\n\`\`\``);

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