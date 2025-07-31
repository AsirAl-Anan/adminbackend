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
  getSubjectsByGroup
} from '../controllers/subject.controller.js'; // Adjust path as needed

const router = express.Router();

// GET routes
router.get('/', getSubjects);
router.get('/filter', getSubjectsByGroupAndLevel); // Query params: ?group=science&level=SSC
router.get('/level/:level', getSubjectsByLevel);   // Path param: /level/SSC
router.get('/group/:group', getSubjectsByGroup);   // Path param: /group/science
router.get('/:id', getSubject);
router.get('/:id/topics', getSubjectTopics);
router.get('/:id/chapters', getSubjectChapters);

// POST routes
router.post('/', addSubject);
router.post('/:id/chapters', addChapter);

// PUT routes
router.put('/:id', editSubject);
router.put('/:id/chapters/:chapterIndex/topics', addTopicToChapter);

// DELETE routes
router.delete('/:id', deleteSubject);
router.delete('/:id/chapters/:chapterIndex/topics/:topicIndex', removeTopicFromChapter);
router.delete('/:id/chapters/:chapterIndex/topics', removeTopicFromChapterByName);

export default router;