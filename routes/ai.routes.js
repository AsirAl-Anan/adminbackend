import { Router } from "express";
import { uploadImage } from "../utils/cloudinary.js";
import { configurations, handleMulterError } from "../utils/multer.js";

import { validateImageUpload, cleanupFiles } from "../utils/file.utils.js";
import {
  createEmbedingsForSubjectsChaptersAndTopics,
  getSimilarDocsBySubjectChapterAndTopic,
  extractAnswers,
  extractQuestions,
  extractTopicFromImage,
  uploadSingleImage, 
  extractArticleFromImage
} from "../controllers/ai.controller.js";
import { extractArticle } from "../services/aiService.js";

const router = Router();

router.post(
  "/extract-cq",
  configurations.fields,
  handleMulterError,
  extractQuestions
);

router.post(
  "/extract-cq-answers",
  configurations.fields,
  handleMulterError,
  extractAnswers
);
router.post(
  "/rag/ingestSubjectEmbeddings",
  createEmbedingsForSubjectsChaptersAndTopics
);
router.post("/rag/getSubjectQuery", getSimilarDocsBySubjectChapterAndTopic);

router.post(
  "/extract-topic",
  configurations.fields,
  handleMulterError,
  extractTopicFromImage
);
router.post(
  "/extract-article",
  configurations.fields,
  handleMulterError,
  extractArticleFromImage
);


// New route for single image upload
router.post(
  "/upload-single-image",
  configurations.imageOnly,
  handleMulterError,
  uploadSingleImage
);

export default router;
