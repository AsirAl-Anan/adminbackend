import { Router } from "express";
import { uploadImage } from "../utils/cloudinary.js";
import { configurations, handleMulterError } from "../utils/multer.js";
import { 
  extractQuestionsFromImages, 
  extractAnswersFromImages 
} from "../services/aiService.js";
import { validateImageUpload, cleanupFiles } from "../utils/file.utils.js";
import { createEmbedingsForSubjectsChaptersAndTopics, getSimilarDocsBySubjectChapterAndTopic , } from "../controllers/rag.controller.js";

const router = Router();

/**
 * Upload images to Cloudinary and return URLs
 * @route POST /upload-images
 */
async function uploadImages(req, res) {
  console.log("Processing image upload request");

  const validation = validateImageUpload(req);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  try {
    // Upload images to Cloudinary in parallel
    const uploadResults = await Promise.all(
      req.files.qb.map(image => uploadImage(image.path))
    );

    const imageUrls = uploadResults.map(result => result.data.url);
    console.log("Images uploaded successfully:", imageUrls);

    // Clean up local files after successful upload
    await cleanupFiles(req.files.qb);

    return res.status(200).json({
      success: true,
      data: imageUrls,
    });
  } catch (error) {
    console.error("Error during image upload:", error);

    // Attempt cleanup even on failure
    await cleanupFiles(req.files.qb, true);

    return res.status(500).json({
      success: false,
      message: "Failed to upload images. Please try again.",
    });
  }
}

/**
 * Extract creative questions from uploaded images
 * @route POST /extract-questions
 */
async function extractQuestions(req, res) {
  console.log("Processing question extraction request");

  const validation = validateImageUpload(req);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  try {
    const questions = await extractQuestionsFromImages(req.files.qb);
    
    return res.status(200).json({
      success: true,
      data: questions,
      count: questions.length,
    });
  } catch (error) {
    console.error("Error extracting questions:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to extract questions from images. Please try again.",
    });
  }
}

/**
 * Extract answers from uploaded images
 * @route POST /extract-answers
 */
async function extractAnswers(req, res) {
  console.log("Processing answer extraction request");

  const validation = validateImageUpload(req);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  try {
    const answers = await extractAnswersFromImages(req.files.qb);
    
    return res.status(200).json({
      success: true,
      data: answers,
    });
  } catch (error) {
    console.error("Error extracting answers:", error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to extract answers from images. Please try again.",
    });
  }
}



router.post('/extract-cq', 
  configurations.fields, 
  handleMulterError, 
  extractQuestions
);

router.post('/extract-cq-answers', 
  configurations.fields, 
  handleMulterError, 
  extractAnswers
);
router.post('/rag/ingestSubjectEmbeddings', createEmbedingsForSubjectsChaptersAndTopics)
router.post('/rag/getSubjectQuery', getSimilarDocsBySubjectChapterAndTopic)
export default router;