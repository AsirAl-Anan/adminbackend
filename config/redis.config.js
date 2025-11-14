import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisClient = createClient({
    url: process.env.UPSTASH_URL,
   
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

export const initRedisClient = async () => {
    await redisClient.connect();
    console.log("Redis client connected successfully.");
};

export default redisClient;
