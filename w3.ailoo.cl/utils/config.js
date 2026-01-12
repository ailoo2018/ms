const dotenv = require('dotenv');

function loadConfig() {


    if (!process.env.SHARED_ENV_PATH)
        process.env.SHARED_ENV_PATH = "../.env";
    if (process.env.SHARED_ENV_PATH) {
        dotenv.config({
            path: process.env.SHARED_ENV_PATH + "." + process.env.NODE_ENV,
            override: false  // Won't override existing env vars
        });
    }
    return process.env;
}

module.exports = loadConfig();

