// services/question.service.js
import CreativeQuestion from '../models/cq.model.js';
import Subject from '../models/subject.model.js';
import Chapter from '../models/chapter.model.js';
import mongoose from 'mongoose';

/**
 * Handles Mongoose validation errors by creating a structured response.
 * @param {Error.ValidationError} error - The Mongoose validation error.
 * @returns {object} A structured error response object.
 */
const handleValidationError = (error) => {
    const details = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
    }));
    return {
        success: false,
        message: 'Validation failed. Please check your input.',
        statusCode: 400,
        details,
    };
};


/**
 * Create a new Creative Question.
 * @param {object} questionData - The raw question data from the request body.
 * @returns {Promise<object>} A promise that resolves to a success or error object.
 */
export const createQuestion = async (questionData) => {
    try {
        const { meta } = questionData;

        // --- Data Validation & Enrichment ---
        if (!meta || !meta.subject?._id || !meta.mainChapter?._id) {
            return { success: false, message: 'Metadata with subject and mainChapter IDs is required.', statusCode: 400 };
        }

        // Fetch subject and chapter to get their names for denormalization
        const subject = await Subject.findById(meta.subject._id).select('name').lean();
        const mainChapter = await Chapter.findById(meta.mainChapter._id).select('name').lean();

        if (!subject) {
            return { success: false, message: `Subject with ID ${meta.subject._id} not found.`, statusCode: 404 };
        }
        if (!mainChapter) {
            return { success: false, message: `Chapter with ID ${meta.mainChapter._id} not found.`, statusCode: 404 };
        }

        // --- IMPORTANT: Denormalization ---
        // Add the fetched names to the metadata before saving.
        questionData.meta.subject.name = subject.name.en; // Assuming english name for now, adjust if needed
        questionData.meta.mainChapter.name = mainChapter.name.en; // Assuming english name, adjust if needed

        const newQuestion = new CreativeQuestion(questionData);
        const savedQuestion = await newQuestion.save();
        
        return { success: true, message: 'Creative Question created successfully.', data: savedQuestion };

    } catch (error) {
        if (error.name === 'ValidationError') {
            return handleValidationError(error);
        }
        console.error("Service Error - createQuestion:", error);
        return { success: false, message: 'An unexpected error occurred while creating the question.', error: error.message };
    }
};

/**
 * Get a single Creative Question by its ID.
 * @param {string} id - The ID of the question.
 * @returns {Promise<object>} A promise that resolves to a success or error object.
 */
export const getQuestionById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, message: 'Invalid question ID format.' };
        }
        const question = await CreativeQuestion.findById(id);

        if (!question) {
            return { success: false, message: 'Question not found.' };
        }
        return { success: true, data: question };
    } catch (error) {
        console.error("Service Error - getQuestionById:", error);
        return { success: false, message: 'Error fetching question.', error: error.message };
    }
};


/**
 * Update an existing Creative Question by its ID.
 * @param {string} id - The ID of the question to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<object>} A promise that resolves to a success or error object.
 */
export const updateQuestion = async (id, updateData) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, message: 'Invalid question ID format.', statusCode: 400 };
        }

        // --- Handle Denormalization on Update ---
        // If the subject or mainChapter ID is being changed, we must also update the denormalized name.
        if (updateData.meta?.subject?._id) {
            const subject = await Subject.findById(updateData.meta.subject._id).select('name').lean();
            if (!subject) return { success: false, message: `Subject with ID ${updateData.meta.subject._id} not found.`, statusCode: 404 };
            updateData.meta.subject.name = subject.name.en;
        }
        if (updateData.meta?.mainChapter?._id) {
            const mainChapter = await Chapter.findById(updateData.meta.mainChapter._id).select('name').lean();
            if (!mainChapter) return { success: false, message: `Chapter with ID ${updateData.meta.mainChapter._id} not found.`, statusCode: 404 };
            updateData.meta.mainChapter.name = mainChapter.name.en;
        }

        const updatedQuestion = await CreativeQuestion.findByIdAndUpdate(
            id,
            { $set: updateData }, // Use $set to prevent overwriting nested objects unless intended
            { new: true, runValidators: true, context: 'query' }
        );

        if (!updatedQuestion) {
            return { success: false, message: 'Question not found.', statusCode: 404 };
        }

        return { success: true, message: 'Question updated successfully.', data: updatedQuestion };

    } catch (error) {
        if (error.name === 'ValidationError') {
            return handleValidationError(error);
        }
        console.error("Service Error - updateQuestion:", error);
        return { success: false, message: 'An unexpected error occurred while updating the question.', error: error.message };
    }
};

/**
 * Delete a Creative Question by its ID.
 * @param {string} id - The ID of the question to delete.
 * @returns {Promise<object>} A promise that resolves to a success or error object.
 */
export const deleteQuestion = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, message: 'Invalid question ID format.' };
        }

        const deletedQuestion = await CreativeQuestion.findByIdAndDelete(id);

        if (!deletedQuestion) {
            return { success: false, message: 'Question not found.' };
        }

        return { success: true, message: 'Question deleted successfully.' };
    } catch (error) {
        console.error("Service Error - deleteQuestion:", error);
        return { success: false, message: 'Error deleting question.', error: error.message };
    }
};