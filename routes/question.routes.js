import express from 'express';
import {
  addQuestion,
  getQuestion,
  editQuestion,
  deleteQuestion,
  getQuestionsBySubject,
} from '../controllers/question.controller.js';

const router = express.Router();

// Middleware to parse stringified JSON fields from FormData
// This is still very useful for handling complex nested objects sent via FormData
function parseBodyMiddleware(req, res, next) {
    const fieldsToParse = [
      'meta', 'source', 'aliases', 'tags',
      'a', 'b', 'c', 'd', 'stem'
    ];

    for (const field of fieldsToParse) {
        if (req.body[field] && typeof req.body[field] === 'string') {
            try {
                req.body[field] = JSON.parse(req.body[field]);
            } catch (error) {
                console.error(`Error parsing JSON for field: ${field}`, error);
                return res.status(400).json({ success: false, message: `Invalid JSON format for field: ${field}` });
            }
        }
    }
    next();
}


// POST /api/questions - Create a new question
router.post('/', parseBodyMiddleware, addQuestion);

// GET /api/questions/:id - Get a single question by ID
router.get('/:id', getQuestion);

// GET /api/questions/subject/:subjectId - Get all questions for a subject
router.get('/subject/:subjectId', getQuestionsBySubject);

// PUT /api/questions/:id - Update a question by ID
router.put('/:id', parseBodyMiddleware, editQuestion);

// DELETE /api/questions/:id - Delete a question by ID
router.delete('/:id', deleteQuestion);



export default router;