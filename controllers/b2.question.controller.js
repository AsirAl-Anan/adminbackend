import b2QuestionService from '../services/b2.question.service.js';
import mongoose from 'mongoose';

/**
 * Add a new B2 Question.
 * POST /api/b2questions
 */
const addQuestion = async (req, res, next) => {
    try {
        const questionData = req.body;
        const newQuestion = await b2QuestionService.createQuestion(questionData);
        res.status(201).json({
            message: "B2 Question added successfully!",
            question: newQuestion
        });
        const embeddingData = {
            question: newQuestion.question.questionText,
            questionType: newQuestion.questionType,
            topic: newQuestion.topic,
            section: newQuestion.section,
            questionType: newQuestion.questionType,
        }
    } catch (error) {
        // Handle Mongoose validation errors specifically
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        // Handle duplicate mainQuestionNumber error
        if (error.code === 11000) {
            return res.status(409).json({ message: "A question with this mainQuestionNumber already exists." });
        }
        console.error("Error adding question:", error);
        next(error); // Pass error to global error handler
    }
};

/**
 * Get all B2 Questions.
 * GET /api/b2questions
 */
const getAllQuestions = async (req, res, next) => {
    try {
        const questions = await b2QuestionService.getAllQuestions();
        res.status(200).json({
            message: "B2 Questions retrieved successfully!",
            count: questions.length,
            questions
        });
    } catch (error) {
        console.error("Error getting all questions:", error);
        next(error);
    }
};

/**
 * Get a B2 Question by ID.
 * GET /api/b2questions/:id
 */
const getQuestionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid question ID format." });
        }
        const question = await b2QuestionService.getQuestionById(id);
        if (!question) {
            return res.status(404).json({ message: "B2 Question not found." });
        }
        res.status(200).json({
            message: "B2 Question retrieved successfully!",
            question
        });
    } catch (error) {
        console.error("Error getting question by ID:", error);
        next(error);
    }
};

/**
 * Update an existing B2 Question.
 * PUT /api/b2questions/:id
 */
const editQuestion = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid question ID format." });
        }
        const updateData = req.body;
        const updatedQuestion = await b2QuestionService.updateQuestion(id, updateData);
        if (!updatedQuestion) {
            return res.status(404).json({ message: "B2 Question not found for update." });
        }
        res.status(200).json({
            message: "B2 Question updated successfully!",
            question: updatedQuestion
        });
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        if (error.code === 11000) { // Catch duplicate key error during update
            return res.status(409).json({ message: "A question with this mainQuestionNumber already exists." });
        }
        console.error("Error updating question:", error);
        next(error);
    }
};

/**
 * Delete a B2 Question.
 * DELETE /api/b2questions/:id
 */
const deleteQuestion = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid question ID format." });
        }
        const deletedQuestion = await b2QuestionService.deleteQuestion(id);
        if (!deletedQuestion) {
            return res.status(404).json({ message: "B2 Question not found for deletion." });
        }
        res.status(200).json({
            message: "B2 Question deleted successfully!",
            question: deletedQuestion
        });
    } catch (error) {
        console.error("Error deleting question:", error);
        next(error);
    }
};

export default {
    addQuestion,
    getAllQuestions,
    getQuestionById,
    editQuestion,
    deleteQuestion,
};