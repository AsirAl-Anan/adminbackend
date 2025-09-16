import express from 'express';
import b2QuestionController from '../controllers/b2.question.controller.js';
const router = express.Router();

// Route to add a new B2 question
router.post('/', b2QuestionController.addQuestion);

// Route to get all B2 questions
router.get('/', b2QuestionController.getAllQuestions);

// Route to get a single B2 question by ID
router.get('/:id', b2QuestionController.getQuestionById);

// Route to update an existing B2 question by ID
router.put('/:id', b2QuestionController.editQuestion);

// Route to delete a B2 question by ID
router.delete('/:id', b2QuestionController.deleteQuestion);

export default router;