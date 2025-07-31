// routes/answer.routes.js

import express from 'express';
import { 
  addAnswerController,
  editAnswerController,
  deleteAnswerController,
  getAnswerByIdController,
  getAnswerByQuestionIdController
} from '../controllers/answer.controller.js';

const router = express.Router();

router.post('/answers', addAnswerController);
router.get('/answers/:id', getAnswerByIdController);
router.get('/answers/question/:questionId', getAnswerByQuestionIdController);
router.put('/answers/:id', editAnswerController);
router.delete('/answers/:id', deleteAnswerController);

export default router;