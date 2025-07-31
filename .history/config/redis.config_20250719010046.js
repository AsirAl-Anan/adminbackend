
import { createClient } from "redis";
import session from "express-session";
import {RedisStore} from 'connect-redis';

const redisStore = new RedisStore(session)

const redisClient = createClient({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN
})

redisClient.on('error', (err) =>{
console.log("redis error: ", err)
})

await redisClient.connect();

export default redisClient;