// controllers/answer.controllers.js

import { 
  addAnswer, 
  editAnswer, 
  deleteAnswer, 
  getAnswerById,
  getAnswerByQuestionId
} from '../services/answer.service.js';

// Add Answer Controller
const addAnswerController = async (req, res) => {
  const result = await addAnswer(req.body);

  if (result.success) {
    return res.status(201).json({
      success: true,
      message: 'Answer added successfully.',
      data: result.data,
    });
  }

  return res.status(400).json({
    success: false,
    message: result.message,
  });
};

// Edit Answer Controller
const editAnswerController = async (req, res) => {
  const { id } = req.params;

  const result = await editAnswer(id, req.body);

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: 'Answer updated successfully.',
      result: result.data,
    });
  }

  return res.status(400).json({
    success: false,
    message: result.message,
  });
};

// Delete Answer Controller
const deleteAnswerController = async (req, res) => {
  const { id } = req.params;

  const result = await deleteAnswer(id);

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: result.message,
  });
};

// Get Answer by ID Controller
const getAnswerByIdController = async (req, res) => {
  const { id } = req.params;

  const result = await getAnswerById(id);

  if (result.success) {
    return res.status(200).json({
      success: true,
    result:   result.data,
    });
  }

  return res.status(404).json({
    success: false,
    message: result.message,
  });
};

// Get Answer by Question ID Controller
const getAnswerByQuestionIdController = async (req, res) => {
  const { questionId } = req.params;

  const result = await getAnswerByQuestionId(questionId);

  if (result.success) {
    return res.status(200).json({
      success: true,
      result: result.data,
    });
  }

  return res.status(404).json({
    success: false,
    message: result.message,
  });
};

// Export all controllers
export {
  addAnswerController,
  editAnswerController,
  deleteAnswerController,
  getAnswerByIdController,
  getAnswerByQuestionIdController
};