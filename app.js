import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import {RedisStore} from "connect-redis";
import redisClient, { initRedisClient } from "./config/redis.config.js";
import AuthRouter from "./routes/auth.routes.js";
import questionRouter from "./routes/question.routes.js";
import aiRouter from "./routes/ai.routes.js";
import subjectRouter from "./routes/subject.routes.js"; 
import { testing } from "./langchain/geminiAi.js";
import dotenv from 'dotenv';
dotenv.config();
import b2Router from "./routes/b2.routes.js";
import splitText from "./langchain/index.js";
import messageRouter from "./routes/message.routes.js";
import { searchSimilarChunks } from "./langchain/index.js";
import uploadRouter from './routes/upload.routes.js';
import { verifyUser } from "./middlewares/auth.middleware.js"; 
const initializeApp = async () => {
    const app = express();

    app.use(express.json({limit:'10mb'}));
    app.use(express.urlencoded({ extended: true , limit:'10mb'}));
    app.use(cookieParser());
    console.log("Client URL DEV:", process.env.CLIENT_URL_DEVELOPMENT);
    console.log("Client URL PROD:", process.env.CLIENT_URL_PRODUCTION);
    app.use(
        cors({
            origin: process.env.NODE_ENV === 'development' ? process.env.CLIENT_URL_DEVELOPMENT : process.env.CLIENT_URL_PRODUCTION,
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
            
        })
    );
    app.set('trust proxy', 1);

    console.log( process.env.SESSION_SECRET)
    await initRedisClient(); // Call the async initialization here

    const sessionMiddleware = session({
      store: new RedisStore({ client: redisClient }),
      name: "admin",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: process.env.NODE_ENV === 'production',
        secure:   process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' ,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    });


    app.use(sessionMiddleware);



    app.use(express.static("uploads"))

    app.use((req, res, next) => {
      console.log(true)
        if (req.path.startsWith('/api/v1/auth')) {
            return next();
        }
        verifyUser(req, res, next);
    });

    app.use("/api/v1/auth", AuthRouter);
    app.use("/api/v1/message", messageRouter );
    app.use("/api/v1/qb", questionRouter);
    app.use("/api/v1/ai", aiRouter);
    app.use("/api/v1/subject", subjectRouter); // Use the subject router
    app.use("/api/v1/b2", b2Router);
    app.use("/api/v1/upload", uploadRouter);
    app.get('/langchain', testing)
    app.post('/langchain',async (req,res)=>{
       const r= await searchSimilarChunks(req.body.query)
        res.send(r)
    } )
    return app;
};

export default initializeApp;
