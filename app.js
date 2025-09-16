import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import {RedisStore} from "connect-redis";
import redisClient from "./config/redis.config.js";
import AuthRouter from "./routes/auth.routes.js";
import questionRouter from "./routes/question.routes.js";
import aiRouter from "./routes/ai.routes.js";
import subjectRouter from "./routes/subject.routes.js"; 
import { connectDb } from "./config/db.config.js";
import { testing } from "./langchain/geminiAi.js";
import b2Router from "./routes/b2.routes.js";
import dotenv from 'dotenv';
dotenv.config();
import splitText from "./langchain/index.js";
import messageRouter from "./routes/message.routes.js";
import { searchSimilarChunks } from "./langchain/index.js";
connectDb()
const app = express();

app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({ extended: true , limit:'10mb'}));
app.use(cookieParser());
console.log("Client URL:", process.env.CLIENT_URL);
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
      
        
    })
);
app.set('trust proxy', 1);

console.log( process.env.SESSION_SECRET)
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
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

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/message", messageRouter );
app.use("/api/v1/qb", questionRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/subject", subjectRouter); // Use the subject router
app.use("/api/v1/b2", b2Router);
app.get('/langchain', testing)
app.post('/langchain',async (req,res)=>{
   const r= await searchSimilarChunks(req.body.query)
    res.send(r)
} )
export default app;