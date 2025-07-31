import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import {RedisStore} from "connect-redis";
import redisClient from "./config/redis.config.js";
import AuthRouter from "./routes/auth.routes.js";

import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.use(
    session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production", // true in production
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        },
    })
);

app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use("/api/v1/auth", AuthRouter);

export default app;