// controllers/question.controller.js
import * as questionService from '../services/question.service.js';

// Generic error handler for controllers
const handleControllerError = (res, error, message = 'An internal server error occurred.') => {
    console.error(`Controller Error: ${message}`, error);
    res.status(500).json({
        success: false,
        message,
        error: error.message,
    });
};

// Create a new question
export const addQuestion = async (req, res) => {
    try {
        console.log("req body for adding cq", req.body.a.question);
        const result = await questionService.createQuestion(req.body);
        console.log("result for adding cq", result);
        if (result.success) {
            res.status(201).json(result);
        } else {
            console.log("result for adding cq", result);
            // Service layer provides status code for client errors
            res.status(result.statusCode || 400).json(result);
        }
    } catch (error) {
        handleControllerError(res, error, 'Error creating question.');
    }
};

// Get a single question by ID
export const getQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await questionService.getQuestionById(id);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        handleControllerError(res, error, 'Error fetching question.');
    }
};

// Update a question by ID
export const editQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: 'Request body cannot be empty.' });
        }
        const result = await questionService.updateQuestion(id, req.body);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(result.statusCode || 400).json(result);
        }
    } catch (error) {
        handleControllerError(res, error, 'Error updating question.');
    }
};

// Delete a question by ID
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await questionService.deleteQuestion(id);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        handleControllerError(res, error, 'Error deleting question.');
    }
};

// Get all questions by subject ID
export const getQuestionsBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const result = await questionService.getQuestionsBySubject(subjectId);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        handleControllerError(res, error, 'Error fetching questions by subject.');
    }
};

// Bulk ingest questions
export const bulkIngestQuestions = async (req, res) => {
    try {
        const files = req.files;
        const { year, subjectId } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        const result = await questionService.bulkIngestQuestions(files, year, subjectId);

        // Even if some failed, return 200 with partial results, or 207 Multi-Status?
        // Using 200 with detailed results array is easier for client.
        res.status(200).json(result);

    } catch (error) {
        handleControllerError(res, error, 'Error processing bulk ingestion.');
    }
};