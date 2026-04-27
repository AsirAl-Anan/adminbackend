import express from "express";
import { verifyUser } from "../auth/auth.middleware.js";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./educationalContent.controller.js";

const router = express.Router();

// Require auth for all content operations
router.use(verifyUser);

// Simple role restriction middleware (Currently Disabled for Testing)
const restrictToAdminOrMod = (req, res, next) => {
    next();
};

router.post("/", restrictToAdminOrMod, asyncHandler(ctrl.createContent));
router.get("/node/:nodeId", asyncHandler(ctrl.getContentByNode));
router.patch("/:id", restrictToAdminOrMod, asyncHandler(ctrl.updateContent));
router.delete("/:id", restrictToAdminOrMod, asyncHandler(ctrl.deleteContent));

export default router;
