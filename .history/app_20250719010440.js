import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import AuthRouter from "./routes/auth.routes.js"
import redisClient from './config/redis.config.js';
import session from 'express-session';
import {RedisStore} from "connect-redis"

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cookieParser());
app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials:true
    }
));


app.use(session({
    new RedisStore({cli}),
}))
app.get('/', (req,res)=>{
    res.send('Hello World!');
})
app.use('/api/v1/auth', AuthRouter)

export default app;