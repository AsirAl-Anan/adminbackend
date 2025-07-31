
import { createClient } from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

const redisStore = connectRedis(session)

const redisClient = createClient({
    url: process.env.REDIS_URL
})