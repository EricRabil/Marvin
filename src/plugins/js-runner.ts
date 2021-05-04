import { inspect } from "util";

function inspectResult(res: any): string {
    return inspect(res, false, 3, false);
}

async function run(code: string) {
    try {
        return inspectResult(await eval(code));
    } catch (e) {
        return e.toString();
    }
}

run(process.env.SRC_STRING!).then(console.log);