import { setup } from "discord-botkit";
import { BotStatus, Eval, Starboard } from "./plugins";
import { DebugCommands, GeneralComands } from "./commands";

setup({
    dotenv: true,
    plugins: [new BotStatus, new Eval, new Starboard],
    commands: [new DebugCommands, new GeneralComands]
});