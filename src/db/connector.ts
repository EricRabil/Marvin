import { ConnectionOptions, createConnection } from "typeorm";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = +(process.env.DB_PORT || 0) || 5432;
const DB_NAME = process.env.DB_NAME || "marvinjs";
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_SYNCHRONIZE = !!process.env.DB_SYNCHRONIZE;
const DB_LOGGING = !!process.env.DB_LOGGING || process.env.DEBUG;

const config: ConnectionOptions = {
	type: "postgres",
	host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    synchronize: DB_SYNCHRONIZE,
    logging: DB_LOGGING ? true : undefined,
    entities: [
        "dist/db/entities/*.js"
    ],
    migrations: [],
    subscribers: []
};

export default async function connect(): Promise<void> {
    await createConnection(config);
}