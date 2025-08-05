// controllers/question.controller.js
// No changes needed in controllers as they primarily pass data between routes and services.
// The service layer handles the updated logic.
import * as questionService from '../services/question.service.js'; // Adjust path if necessary
import { uploadImage } from '../utils/cloudinary.js';
// Create a new question
export const addQuestion = async (req, res) => {
  try {
   

    const result = await questionService.createQuestion(req.body);
    if (result.success === true) {
      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: req.body, // Return the created question data
      });
    } else {
      // Determine appropriate status code based on error type
      const statusCode = result.message.includes('Validation') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
        details: result.details // Include detailed validation errors
      });
    }
  } catch (error) {
    console.error("Controller Error - Add Question:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating question',
      error: error.message
    });
  }
};

// Get a single question by ID
export const getQuestion = async (req, res) => {

  try {
    const { id } = req.params;
    const result = await questionService.getQuestionById(id);
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Controller Error - Get Question:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching question',
      error: error.message
    });
  }
};

// Get questions by subject ID
export const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const result = await questionService.getQuestionsBySubject(subjectId);
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      // Service layer handles "not found" for single items, but for lists, empty is ok
      res.status(500).json({ // Assuming service error if not success
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error("Controller Error - Get Questions By Subject:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching questions by subject',
      error: error.message
    });
  }
};

// Get questions by subject ID and level (group default from subject)
export const getQuestionsBySubjectAndLevel = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { level, group } = req.query; // group is optional
    if (!level) {
      return res.status(400).json({
        success: false,
        message: 'Level is required as a query parameter'
      });
    }
    const result = await questionService.getQuestionsBySubjectAndLevel(subjectId, level, group);
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error("Controller Error - Get Questions By Subject and Level:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching questions by subject and level',
      error: error.message
    });
  }
};

// Get questions by various filters
export const getQuestionsByData = async (req, res) => {
  try {
    // Filters come from query parameters
    const filters = req.query;
    const result = await questionService.getQuestionsByFilters(filters);
    if (result.success) {
      res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error("Controller Error - Get Questions By Data:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching questions by data',
      error: error.message
    });
  }
};

// Update a question by ID
export const editQuestion = async (req, res) => {
  try {
    const { id } = req.params;
      if(!req.body){
        return res.status(400).json({
          success: false,
          message: 'Request body is empty'
        });
      }
    const result = await questionService.updateQuestion(id, req.body);
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Question updated successfully',
        data: result.data
      });
    } else {
      let statusCode = 500; // Default for unexpected errors
      if (result.message.includes('Validation')) {
        statusCode = 400;
      } else if (result.message.includes('not found')) {
        statusCode = 404;
      }
      res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error("Controller Error - Edit Question:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating question',
      error: error.message
    });
  }
};

// Delete a question by ID
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await questionService.deleteQuestion(id);
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data // Optional: return deleted data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Controller Error - Delete Question:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting question',
      error: error.message
    });
  }
};
