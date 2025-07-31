import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import {RedisStore} from "connect-redis";
import redisClient from "./config/redis.config.js";
import AuthRouter from "./routes/auth.routes.js";
import questionRouter from "./routes/question.routes.js";
import answerRouter from "./routes/answer.routes.js";
import aiRouter from "./routes/ai.routes.js";
import subjectRouter from "./routes/subject.routes.js"; 
import { connectDb } from "./config/db.config.js";
import dotenv from 'dotenv';
dotenv.config();

import messageRouter from "./routes/message.routes.js";
connectDb()
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
console.log("Client URL:", process.env.CLIENT_URL);
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Set-Cookie"],
        
    })
);

app.use(
    session({
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly:true, // true in production
            secure:true, // true in production
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        },
    })
);

app.use(express.static("uploads"))

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/message", messageRouter );
app.use("/api/v1/qb", questionRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/subject", subjectRouter); // Use the subject router

export default app;