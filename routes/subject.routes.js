import express from 'express';
import {
  getSubjects,
  getSubject,
  getSubjectTopics,
  getSubjectChapters,
  addSubject,
  editSubject,
  deleteSubject,
  addChapter,
  addTopicToChapter,
  removeTopicFromChapter,
  removeTopicFromChapterByName,
  getSubjectsByGroupAndLevel,
  getSubjectsByLevel,
  getSubjectsByGroup,
  removeChapterFromSubject,
  editTopic
} from '../controllers/subject.controller.js'; // Adjust path as needed
import { configurations } from '../utils/multer.js';
import { deleteAll, recreateAllTopicEmbeddings } from '../services/subject.service.js';
const router = express.Router();

// GET routes
router.get('/', getSubjects);
router.get('/filter', getSubjectsByGroupAndLevel); // Query params: ?group=science&level=SSC // default route for fetching subject
router.get('/level/:level', getSubjectsByLevel);   // Path param: /level/SSC
router.get('/group/:group', getSubjectsByGroup);   // Path param: /group/science
router.get('/:id', getSubject);  // get subject by id
router.get('/:id/topics', getSubjectTopics);
router.get('/:id/chapters', getSubjectChapters);

// POST routes
router.post('/', addSubject);
router.post('/:id/chapters', addChapter);
const parseJson = (req, res, next) => {
  console.log(req.body);
  if (req.body.topicData) {
    req.body.topicData = JSON.parse(req.body.topicData);
  }
  next();
}

router.post('/delete', deleteAll)
// PUT routes
router.put('/:id', editSubject);
router.put('/:id/chapters/:chapterIndex/topics', configurations.any, parseJson,addTopicToChapter);
router.put('/:id/chapters/:chapterIndex/topics/:topicIndex',configurations.any,editTopic);
// DELETE routes
router.delete('/:id', deleteSubject);
router.delete('/:id/chapters/:chapterIndex/topics/:topicIndex', removeTopicFromChapter);
router.delete('/:id/chapters/:chapterIndex/topics', removeTopicFromChapterByName);
router.delete('/:id/chapters/:chapterId',  removeChapterFromSubject);
export default router;