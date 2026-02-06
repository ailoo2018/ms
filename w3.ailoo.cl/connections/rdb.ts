import redis from "redis";

const db = redis.createClient({
    url: process.env.REDIS_CONNECTION_STRING,
    socket: {
        connectTimeout: 30000,  // Increase timeout to 30 seconds
        keepAlive: true,       // Keep connections alive
        reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Max reconnection attempts reached');
            return Math.min(retries * 100, 3000); // Exponential backoff
        }
    }
});
db.connect().then(function (            ) {
    console.log("connected redis: " + process.env.REDIS_CONNECTION_STRING)
});

export async function deleteKeysByPattern(pattern) {
    const client = db;
    try {
        let keysToDelete = [];
        let cursor : string = '0';

        do {
            const reply = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });

            cursor = reply.cursor.toString();
            keysToDelete = keysToDelete.concat(reply.keys);
        } while (cursor !== '0');

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

export { db }
