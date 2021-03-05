import fs from "fs-extra";
import { join } from "path";

const packagePath = join(__dirname, "..", "..", "package.json");

const pkg: { version: string } = fs.readJSONSync(packagePath);

export const version = pkg.version;