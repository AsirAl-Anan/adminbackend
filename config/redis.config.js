import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const redisClient = createClient({
    url: process.env.UPSTASH_URL,
    socket: {
        tls: true,
        rejectUnauthorized: false, // Upstash uses valid certs, but this is safe fallback
    },
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

await redisClient.connect();

export default redisClient;