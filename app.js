import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import dotenv from "dotenv";
dotenv.config();

import redisClient, { initRedisClient } from "./config/redis.config.js";
import { verifyUser } from "./features/auth/auth.middleware.js";
import { errorHandler } from "./utils/errors.js";

// Feature Routes
import authRoutes from "./features/auth/auth.routes.js";
import subjectRoutes from "./features/subjects/subject.routes.js";
import taxonomyRoutes from "./features/taxonomy/taxonomy.routes.js";
import questionRoutes from "./features/questions/question.routes.js";
import templateRoutes from "./features/templates/template.routes.js";
import contentTemplateRoutes from "./features/contentTemplates/contentTemplate.routes.js";
import educationalContentRoutes from "./features/educationalContent/educationalContent.routes.js";
import writerRoutes from "./features/writers/writer.routes.js";

import uploadRouter from "./routes/upload.routes.js";

const initializeApp = async () => {
  const app = express();

  // ── Body Parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: process.env.NODE_ENV === "development"
      ? process.env.CLIENT_URL_DEVELOPMENT
      : process.env.CLIENT_URL_PRODUCTION,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.set("trust proxy", 1);

  // ── Session + Redis ────────────────────────────────────────────────────────
  await initRedisClient();
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    name: "employee",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }));

  // ── Static Files ───────────────────────────────────────────────────────────
  app.use(express.static("uploads"));

  // ── Auth Guard (all routes except /auth) ──────────────────────────────────
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/v1/auth")) return next();
    verifyUser(req, res, next);
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/subjects", subjectRoutes);
  app.use("/api/v1/taxonomy", taxonomyRoutes);
  app.use("/api/v1/questions", questionRoutes);
  app.use("/api/v1/templates", templateRoutes);
  app.use("/api/v1/content-templates", contentTemplateRoutes);
  app.use("/api/v1/educational-content", educationalContentRoutes);
  app.use("/api/v1/writers", writerRoutes);
  app.use("/api/v1/upload", uploadRouter);

  // ── Global Error Handler ───────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default initializeApp;
