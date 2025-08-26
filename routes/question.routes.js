import express from 'express';
import {
  addQuestion,
  getQuestion,
  getQuestionsBySubject,
  getQuestionsBySubjectAndLevel,
  getQuestionsByData,
  editQuestion,
  deleteQuestion,
  getQuestionFromEmbeddingController
} from '../controllers/question.controller.js';
import { configurations } from '../utils/multer.js'; // Ensure this is updated
import { uploadImage } from '../utils/cloudinary.js';
import { cleanupFiles } from '../utils/file.utils.js';

const router = express.Router();

// --- IMPORTANT: Multer Configuration Update ---
// In your `utils/multer.js` file, ensure `configurations.fields` is updated
// to accept the new top-level image fields:
// const fields = [
//   { name: 'stemImage', maxCount: 1 },
//   { name: 'cAnswerImage', maxCount: 1 },
//   { name: 'dAnswerImage', maxCount: 1 },
// ];
// This is crucial for the `addImage` middleware to work correctly.

// Middleware to upload images and add their URLs to the request body
async function addImage(req, res, next) {
  if (req.files) {
    for (const [fieldName, files] of Object.entries(req.files)) {
      if (files && files.length > 0) {
        const urls = [];
        for (const file of files) {
          const result = await uploadImage(file);
          cleanupFiles([file]);
          if (result?.data?.url) {
            urls.push(result.data.url);
          }
        }
        req.body[fieldName] = urls; // store all uploaded URLs in array
      }
    }
  }
  next();
}

// Middleware to parse stringified JSON fields from FormData
async function parseBodyMiddleware(req, res, next) {
  const fieldsToParse = ['chapter', 'cTopic', 'dTopic'];

  fieldsToParse.forEach(field => {
    if (req.body[field]) {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (error) {
        console.error(`Failed to parse field: ${field}`, error);
        // Optionally, you can send an error response here
        // return res.status(400).json({ success: false, message: `Invalid JSON format for field: ${field}` });
      }
    }
  });

  next();
}

// POST /api/questions - Create a new question
// The order is important: multer -> addImage (uploads files) -> parseBody (parses text fields) -> controller
router.post('/', configurations.fields, addImage, parseBodyMiddleware, addQuestion);

router.post('/rag', getQuestionFromEmbeddingController);

// GET /api/questions/:id - Get a single question by ID
router.get('/:id', getQuestion);

// GET /api/questions/subject/:subjectId - Get questions by subject ID
router.get('/subject/:subjectId', getQuestionsBySubject);

// GET /api/questions/subject/:subjectId/level - Get questions by subject ID and level
router.get('/subject/:subjectId/level', getQuestionsBySubjectAndLevel);

// GET /api/questions/filter - Get questions by various filters
router.get('/filter', getQuestionsByData);

// PUT /api/questions/:id - Update a question by ID
// Note: PUT requests with FormData can be tricky. This setup assumes image updates are handled similarly.
router.put('/:id', configurations.fields, addImage, parseBodyMiddleware, editQuestion);

// DELETE /api/questions/:id - Delete a question by ID
router.delete('/:id', deleteQuestion);

export default router;