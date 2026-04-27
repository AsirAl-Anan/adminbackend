import express from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import * as ctrl from "./question.controller.js";

const router = express.Router();

// Specific routes BEFORE parameterized ones to avoid conflicts
router.get("/node/:nodeId", asyncHandler(ctrl.getQuestionsByNode));
router.get("/subject/:subjectId", asyncHandler(ctrl.getQuestionsBySubject));
router.post("/", asyncHandler(ctrl.createQuestion));
router.get("/:id", asyncHandler(ctrl.getQuestionById));
router.put("/:id/status", asyncHandler(ctrl.updateQuestionStatus));
router.put("/:id", asyncHandler(ctrl.updateQuestion));
router.delete("/:id", asyncHandler(ctrl.deleteQuestion));

export default router;
