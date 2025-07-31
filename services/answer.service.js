// services/answer.service.js

import Answer from '../models/answer.model.js';

// Add a new answer
const addAnswer = async (answerData) => {
  try {
    const answer = new Answer(answerData);
    await answer.save();
    return { success: true,  answer };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Edit an existing answer by ID
const editAnswer = async (answerId, updateData) => {
  try {
    const updatedAnswer = await Answer.findByIdAndUpdate(
      answerId,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedAnswer) {
      return { success: false, message: 'Answer not found.' };
    }
    return { success: true,  updatedAnswer };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Delete an answer by ID
const deleteAnswer = async (answerId) => {
  try {
    const deletedAnswer = await Answer.findByIdAndDelete(answerId);
    if (!deletedAnswer) {
      return { success: false, message: 'Answer not found.' };
    }
    return { success: true, message: 'Answer deleted successfully.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Get answer by ID
const getAnswerById = async (answerId) => {
  try {
    const answer = await Answer.findById(answerId);
    if (!answer) {
      return { success: false, message: 'Answer not found.' };
    }
    return { success: true,  answer };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Get answer by question ID
const getAnswerByQuestionId = async (questionId) => {
  try {
    const answer = await Answer.findOne({ question: questionId });
    if (!answer) {
      return { success: false, message: 'Answer not found for this question.' };
    }
    return { success: true,  answer };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Export all functions
export {
  addAnswer,
  editAnswer,
  deleteAnswer,
  getAnswerById,
  getAnswerByQuestionId
};