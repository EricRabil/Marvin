import dotenv from "dotenv";
Object.assign(process.env, dotenv.config().parsed!);

import DiscordController from "./bot/controller";
import connect from "./db/connector";
import ERLog from "./util/log";
import { version } from "./util/meta";

async function boot() {
    const Log = ERLog("MarvinBoot");

    Log.info(`Marvin v${version} is here`);

    Log.info("Connecting to database");

    await connect().then(Log.time(duration => `Connected to database in ${duration}ms`));

    Log.info("Connecting to Discord");

    await DiscordController.shared.connect().then(Log.time(duration => `Connected to Discord in ${duration}ms`));
}

boot();
