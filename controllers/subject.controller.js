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

export const getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();
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
