import { DCommandGroup, BaseDPlugin, DPlugin } from "discord-botkit";

@DPlugin("logger")
@DCommandGroup("logger")
export class Logger extends BaseDPlugin {
}