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
  extractImageData,
} from "../controllers/ai.controller.js";

const router = Router();

/**
 * Upload images to Cloudinary and return URLs
 * @route POST /upload-images
 */
async function uploadImages(req, res) {
  console.log("Processing image upload request");
  console.log(req.files);
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
      req.files.qb.map((image) => uploadImage(image.path))
    );

    const imageUrls = uploadResults.map((result) => result.data.url);
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
  "/extract-segments",
  configurations.fields,
  handleMulterError,
  extractTopicFromImage
);
router.post(
  "/extract-image-data",
  configurations.fields,
  handleMulterError,
  extractImageData
);
export default router;
