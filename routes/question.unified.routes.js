import express from "express";
import * as questionController from "../controllers/question.unified.controller.js";

const router = express.Router();

// Specific routes BEFORE param routes to avoid :id capture
router.get("/by-taxonomy-link/:nodeId", questionController.getQuestionsByTaxonomyLink);
router.post("/", questionController.createQuestion);
router.get("/:id", questionController.getQuestionById);
router.get("/node/:nodeId", questionController.getQuestionsByNode);
router.get("/subject/:subjectId", questionController.getQuestionsBySubject);
router.put("/:id", questionController.updateQuestion);
router.delete("/:id", questionController.deleteQuestion);

export default router;
