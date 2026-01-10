import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const getRedisUrl = () => {
    if (process.env.UPSTASH_URL && process.env.UPSTASH_URL.includes('upstash.io') && process.env.UPSTASH_URL.startsWith('redis://')) {
        return process.env.UPSTASH_URL.replace('redis://', 'rediss://');
    }
    return process.env.UPSTASH_URL;
};

const redisClient = createClient({
    url: getRedisUrl(),
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 20) {
                console.error("Too many retries on REDIS. Connection Terminated");
                return new Error("Too many retries on REDIS. Connection Terminated");
            }
            return Math.min(retries * 50, 500);
        }
    }
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

export const initRedisClient = async () => {
    await redisClient.connect();
    console.log("Redis client connected successfully.");
};

export default redisClient;
