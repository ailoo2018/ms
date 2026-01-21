const redis = require("redis");
const db = redis.createClient({
    url: process.env.REDIS_CONNECTION_STRING,
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
        if (retries > 10) {
            return new Error('Max retries reached');
        }
        return Math.min(retries * 100, 3000);
    }
});

/*db.connect().then(function (            ) {
    console.log("connected redis")
});*/

db.on('error', (err) => console.error('Redis Client Error', err));
async function deleteKeysByPattern(pattern) {
    const client = db;
    try {
        let keysToDelete = [];
        let cursor = 0;

        do {
            const { keys, cursor: nextCursor } = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });

            cursor = nextCursor;
            keysToDelete = keysToDelete.concat(keys);
        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
            console.log(`Deleting ${keysToDelete.length} keys matching pattern: ${pattern}`);
            await client.del(keysToDelete);

            return { totalDeleted: keysToDelete.length, pattern}
        } else {
            return { totalDeleted: 0, pattern }
        }
    } catch (error) {
        console.error('Error deleting keys:', error);
    } finally {
     //   await client.quit();
    }
}
const connectRedis = async () => {
    if (!db.isOpen) {
        await db.connect();
    }
};


module.exports.connectRedis=connectRedis;
module.exports.redisClient=db;
module.exports.deleteKeysByPattern=deleteKeysByPattern;