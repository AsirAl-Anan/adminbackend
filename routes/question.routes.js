// routes/question.routes.js
// No changes needed in routes as they operate on the request body and query params generically.
// The service and model handle the updated data structure.
import express from 'express';
import {
  addQuestion,
  getQuestion,
  getQuestionsBySubject,
  getQuestionsBySubjectAndLevel,
  getQuestionsByData,
  editQuestion,
  deleteQuestion
} from '../controllers/question.controller.js'; // Adjust path
import { configurations } from '../utils/multer.js';
import { uploadImage } from '../utils/cloudinary.js';
import { cleanupFiles } from '../utils/file.utils.js';
const router = express.Router();

// POST /api/questions - Create a new question

async function addImage(req, res, next) {

  for(const file of Object.entries(req.files)){
    console.log(file[0]);
    const resUrl =  await uploadImage(file[1][0])
    cleanupFiles(file[1]);
    req.body[file[0]] =resUrl?.data?.url;
    
  }
  req.body.cTopic = req.body.cTopic ? JSON.parse(req.body.cTopic) : null;
  req.body.dTopic = req.body.dTopic ? JSON.parse(req.body.dTopic) : null;

  if(req.body.cSubTopic) {
  req.body.cSubTopic = req.body.cSubTopic ? JSON.parse(req.body.cSubTopic) : null;

  }
  if(req.body.dSubTopic){
  req.body.dSubTopic = req.body.dSubTopic ? JSON.parse(req.body.dSubTopic) : null;
  }
  req.body.chapter = req.body.chapter ? JSON.parse(req.body.chapter) : null;
  
 next();
}
router.post('/', configurations.fields, addImage,addQuestion );

// GET /api/questions/:id - Get a single question by ID
router.get('/:id', getQuestion);

// GET /api/questions/subject/:subjectId - Get questions by subject ID
router.get('/subject/:subjectId', getQuestionsBySubject);

// GET /api/questions/subject/:subjectId/level - Get questions by subject ID and level (group optional via query)
router.get('/subject/:subjectId/level', getQuestionsBySubjectAndLevel);

// GET /api/questions/filter - Get questions by various filters (topic, board, year, etc. via query params)
router.get('/filter', getQuestionsByData);

// PUT /api/questions/:id - Update a question by ID
router.put('/:id', editQuestion);

// DELETE /api/questions/:id - Delete a question by ID
router.delete('/:id', deleteQuestion);

export default router;
