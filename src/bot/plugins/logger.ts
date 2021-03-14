import { CommandoMessage } from "discord.js-commando";
import { DCommandGroup } from "../util/declarative-commands";
import { BaseDPlugin, DCommandDenied, DPlugin } from "../util/declarative-plugins";

@DPlugin("logger")
@DCommandGroup("logger")
export class Logger extends BaseDPlugin {
}