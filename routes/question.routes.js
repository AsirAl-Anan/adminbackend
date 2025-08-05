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
 if(req.files){
for(const file of Object.entries(req.files)){
    console.log(file[0]);
    const resUrl =  await uploadImage(file[1][0])
    cleanupFiles(file[1]);
    req.body[file[0]] =resUrl?.data?.url;
    
  }
 } 

  
 next();
}
async function stringifyTopics(req, res, next) {
   console.log(req.body);
    if(req?.body?.aTopic !== undefined && req?.body?.aTopic !== null){
    req.body.aTopic = req.body.aTopic ? JSON.parse(req.body.aTopic) : null;
   }
   if(req?.body?.bTopic !== undefined && req?.body?.bTopic !== null){
    req.body.bTopic = req.body.bTopic ? JSON.parse(req.body.bTopic) : null;
   }
   if(req?.body?.bSubTopic !== undefined && req?.body?.bSubTopic !== null){
    req.body.bSubTopic = req.body.bSubTopic ? JSON.parse(req.body.bSubTopic) : null;
   }
  if(req?.body?.cTopic !== undefined && req?.body?.cTopic !== null){
 req.body.cTopic = req.body.cTopic ? JSON.parse(req?.body?.cTopic) : null;
  }
  if(req?.body?.dTopic !== undefined && req?.body?.dTopic !== null){
  req.body.dTopic = req.body.dTopic ? JSON.parse(req.body.dTopic) : null;

  }

  if(req?.body?.cSubTopic !== undefined && req?.body?.cSubTopic !== null) {
  req.body.cSubTopic = req.body.cSubTopic ? JSON.parse(req.body.cSubTopic) : null;

  }
  if(req?.body?.dSubTopic !== undefined && req.body.dSubTopic !== null){
  req.body.dSubTopic = req.body.dSubTopic ? JSON.parse(req.body.dSubTopic) : null;
  }
  if(req?.body?.chapter   !== undefined && req.body.chapter !== null){
  req.body.chapter = req.body.chapter ? JSON.parse(req.body.chapter) : null;
  }
  next();
}
router.post('/', configurations.fields, addImage,stringifyTopics ,addQuestion );

// GET /api/questions/:id - Get a single question by ID
router.get('/:id', getQuestion);

// GET /api/questions/subject/:subjectId - Get questions by subject ID
router.get('/subject/:subjectId', getQuestionsBySubject);

// GET /api/questions/subject/:subjectId/level - Get questions by subject ID and level (group optional via query)
router.get('/subject/:subjectId/level', getQuestionsBySubjectAndLevel);

// GET /api/questions/filter - Get questions by various filters (topic, board, year, etc. via query params)
router.get('/filter', getQuestionsByData);

// PUT /api/questions/:id - Update a question by ID
router.put('/:id', configurations.none,stringifyTopics, editQuestion);

// DELETE /api/questions/:id - Delete a question by ID
router.delete('/:id', deleteQuestion);

export default router;
