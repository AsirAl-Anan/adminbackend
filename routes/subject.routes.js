import express from "express";
import * as subjectController from "../controllers/subject.controller.js";

const router = express.Router();

// ----------------- Subject Routes -----------------
router.post("/subjects", subjectController.createSubject);
router.get("/subjects", subjectController.getAllSubjects);
// NEW: Get subjects by level and group for CQ creation Step 1
router.get("/subjects/filter", subjectController.getSubjectsByFilter);
router.get("/subjects/:id", subjectController.getSubjectById);
router.put("/subjects/:id", subjectController.updateSubject);
router.delete("/subjects/:id", subjectController.deleteSubject);

// ----------------- Chapter Routes -----------------
router.post("/subjects/:subjectId/chapters", subjectController.createChapter);
// NEW: Get chapters for a specific subject for CQ creation Step 2
router.get("/subjects/:subjectId/chapters", subjectController.getChaptersBySubject);
router.put("/chapters/:id", subjectController.updateChapter);
router.delete("/chapters/:id", subjectController.deleteChapter);

// ----------------- Topic Routes -----------------
router.post("/chapters/:chapterId/topics", subjectController.createTopic);
// NEW: Get topics for a specific chapter for CQ creation Step 3
router.get("/chapters/:chapterId/topics", subjectController.getTopicsByChapter);
router.put("/topics/:id", subjectController.updateTopic);
router.put("/topics/:topicId/articles", subjectController.updateTopicArticles);
router.delete("/topics/:id", subjectController.deleteTopic);
// NEW: Get question types for a specific topic for CQ creation Step 3
router.get("/topics/:topicId/question-types", subjectController.getQuestionTypesByTopic);


// ----------------- Formula Routes -----------------
router.post("/topics/:topicId/formulas", subjectController.createFormula);
router.get("/formulas/:id", subjectController.getFormulaById);
router.put("/formulas/:id", subjectController.updateFormula);
router.delete("/formulas/:id", subjectController.deleteFormula);

export default router;