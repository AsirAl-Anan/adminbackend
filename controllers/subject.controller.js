import * as subjectService from "../services/subject.service.js";

// ----------------- Subject Controller -----------------

export const createSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

// NEW: Create Subject Full (Bulk)
export const createSubjectFull = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubjectFull(req.body);
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

export const getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.status(200).json(subjects);
  } catch (error) {
    next(error);
  }
};

// NEW: Get subjects by level and group
export const getSubjectsByFilter = async (req, res, next) => {
  try {
    const { level, group } = req.query;
    console.log("level:", level, "group:", group);
    const subjects = await subjectService.getSubjectsByLevelAndGroup(level, group);
    res.status(200).json(subjects);
  } catch (error) {
    next(error);
  }
};


export const getSubjectById = async (req, res, next) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    res.status(200).json(subject);
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    res.status(200).json(subject);
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const result = await subjectService.deleteSubject(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ----------------- Chapter Controller -----------------

export const createChapter = async (req, res, next) => {
  try {
    const chapter = await subjectService.createChapter(
      req.params.subjectId,
      req.body
    );
    res.status(201).json(chapter);
  } catch (error) {
    next(error);
  }
};

// NEW: Get chapters for a subject
export const getChaptersBySubject = async (req, res, next) => {
  try {
    const chapters = await subjectService.getChaptersBySubject(req.params.subjectId);
    res.status(200).json(chapters);
  } catch (error) {
    next(error);
  }
};

export const updateChapter = async (req, res, next) => {
  try {
    const chapter = await subjectService.updateChapter(req.params.id, req.body);
    res.status(200).json(chapter);
  } catch (error) {
    next(error);
  }
};

export const deleteChapter = async (req, res, next) => {
  try {
    const result = await subjectService.deleteChapter(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ----------------- Topic Controller -----------------

export const createTopic = async (req, res, next) => {
  try {
    const topic = await subjectService.createTopic(
      req.params.chapterId,
      req.body
    );
    res.status(201).json(topic);
  } catch (error) {
    next(error);
  }
};

export const bulkCreateTopics = async (req, res, next) => {
  try {
    const { subjectId, topics } = req.body;
    const createdTopics = await subjectService.bulkCreateTopics(
      req.params.chapterId,
      subjectId,
      topics
    );
    res.status(201).json(createdTopics);
  } catch (error) {
    next(error);
  }
};

// NEW: Get topics for a chapter
export const getTopicsByChapter = async (req, res, next) => {
  try {
    const topics = await subjectService.getTopicsByChapter(req.params.chapterId);
    res.status(200).json(topics);
  } catch (error) {
    next(error);
  }
};

// NEW: Get question types for a topic
export const getQuestionTypesByTopic = async (req, res, next) => {
  try {
    console.log("req.params.topicId:", req.params.topicId);
    const questionTypes = await subjectService.getQuestionTypesByTopic(req.params.topicId);
    res.status(200).json(questionTypes);
  } catch (error) {
    next(error);
  }
};

export const updateTopic = async (req, res, next) => {
  try {
    const topic = await subjectService.updateTopic(req.params.id, req.body);
    res.status(200).json(topic);
  } catch (error) {
    next(error);
  }
};

export const deleteTopic = async (req, res, next) => {
  try {
    const result = await subjectService.deleteTopic(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateTopicArticles = async (req, res, next) => {
  try {
    const topic = await subjectService.updateTopicArticles(req.params.topicId, req.body.articles);
    res.status(200).json(topic);
  } catch (error) {
    next(error);
  }
};

// ----------------- Formula Controller -----------------

export const createFormula = async (req, res, next) => {
  try {
    const formula = await subjectService.createFormula(
      req.params.topicId,
      req.body
    );
    res.status(201).json(formula);
  } catch (error) {
    next(error);
  }
};

export const getFormulaById = async (req, res, next) => {
  try {
    const formula = await subjectService.getFormulaById(req.params.id);
    res.status(200).json(formula);
  } catch (error) {
    next(error);
  }
};

export const updateFormula = async (req, res, next) => {
  try {
    const formula = await subjectService.updateFormula(req.params.id, req.body);
    res.status(200).json(formula);
  } catch (error) {
    next(error);
  }
};

export const deleteFormula = async (req, res, next) => {
  try {
    const result = await subjectService.deleteFormula(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};