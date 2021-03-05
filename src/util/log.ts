import Logger from "bunyan";
import bformat from "bunyan-format";

const SHARED_STREAM = bformat({ outputMode: "short" });

interface MarvinLogger extends Logger {
    time(format: (duration: number) => string): () => void;
}

/**
 * Constructs a logging object with the given namespace
 * @param name namespace of the log
 * @constructor
 */
export default function ERLog (name: string): MarvinLogger {
  return Object.assign(Logger.createLogger({
    name,
    stream: SHARED_STREAM,
    level: "debug"
  }), {
      time(this: MarvinLogger, format: (duration: number) => string, level: "info" | "debug" | "error" | "warn" | "trace" = "info") {
          const start = Date.now();

          return () => {
              this[level](format(Date.now() - start));
          };
      }
  });
}

/**
 * Shared logging object. Use this for one-off situations only, please.
 */
export const RootLog = ERLog("Marvin");