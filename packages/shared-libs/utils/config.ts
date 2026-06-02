import dotenv from "dotenv";
import fs from "fs";
import path from "path";

export function loadConfig() {
    const nodeEnv = process.env.NODE_ENV ?? "develper";
    const envFile = `.env.${nodeEnv}`;

    // If explicitly set, use that path directly
    if (process.env.SHARED_ENV_PATH) {
        dotenv.config({
            path: path.join(process.env.SHARED_ENV_PATH, envFile),
            override: false,
        });
        return process.env;
    }

    // Search for .env.<NODE_ENV> in ../ then ../../
    const searchPaths = [
        path.resolve("../", envFile),
        path.resolve("../../", envFile),
    ];

    const found = searchPaths.find((p) => fs.existsSync(p));

    if (found) {
        process.env.SHARED_ENV_PATH = path.dirname(found);
        dotenv.config({ path: found, override: false });
    } else {
        console.warn(
            `[loadConfig] Could not find ${envFile} in: ${searchPaths.join(", ")}`
        );
    }


     return process.env;
}


