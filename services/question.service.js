// services/question.service.js
import CreativeQuestion from '../models/cq.model.js';
import Subject from '../models/subject.model.js';
import Chapter from '../models/chapter.model.js';
import mongoose from 'mongoose';
import * as aiService from './aiService.js';

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

// Helper to clean content blocks
const cleanBlocks = (blocks) => {
    if (!Array.isArray(blocks)) return [];
    // Filter out blocks that are completely empty (though frontend usually handles this)
    // And re-assign order to ensure it's sequential
    return blocks
        .map((block, index) => ({
            ...block,
            order: index + 1,
        }));
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
        questionData.meta.subject.name = subject.name.en;
        questionData.meta.mainChapter.name = mainChapter.name.en;

        // --- Sanitization of Content Blocks ---
        // Ensure consistent ordering and structure for block-based fields
        if (questionData.stem) questionData.stem = cleanBlocks(questionData.stem);

        ['a', 'b', 'c', 'd'].forEach(part => {
            if (questionData[part]) {
                if (questionData[part].question) questionData[part].question = cleanBlocks(questionData[part].question);
                if (questionData[part].answer) questionData[part].answer = cleanBlocks(questionData[part].answer);
            }
        });

        const newQuestion = new CreativeQuestion(questionData);
        const savedQuestion = await newQuestion.save();

        return { success: true, message: 'Creative Question created successfully.', data: savedQuestion };

    } catch (error) {
        if (error.name === 'ValidationError') {
            console.log("Validation Error - createQuestion:", error);
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

        // --- Sanitization of Content Blocks on Update ---
        if (updateData.stem) updateData.stem = cleanBlocks(updateData.stem);
        ['a', 'b', 'c', 'd'].forEach(part => {
            if (updateData[part]) {
                if (updateData[part].question) updateData[part].question = cleanBlocks(updateData[part].question);
                if (updateData[part].answer) updateData[part].answer = cleanBlocks(updateData[part].answer);
            }
        });


        const updatedQuestion = await CreativeQuestion.findByIdAndUpdate(
            id,
            { $set: updateData },
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

/**
 * Get all Creative Questions by Subject ID.
 * @param {string} subjectId - The ID of the subject.
 * @returns {Promise<object>} A promise that resolves to a success or error object.
 */
export const getQuestionsBySubject = async (subjectId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(subjectId)) {
            return { success: false, message: 'Invalid subject ID format.' };
        }
        const questions = await CreativeQuestion.find({ 'meta.subject._id': subjectId }).sort({ createdAt: -1 });

        return { success: true, data: questions };
    } catch (error) {
        console.error("Service Error - getQuestionsBySubject:", error);
        return { success: false, message: 'Error fetching questions by subject.', error: error.message };
    }
};

/**
 * Bulk ingest questions from uploaded images.
 * @param {Array<Object>} files - List of uploaded files.
 * @param {string} year - Year of the questions.
 * @param {string} subjectId - ID of the subject.
 * @returns {Promise<object>} Summary of processing.
 */
export const bulkIngestQuestions = async (files, year, subjectId) => {
    try {
        if (!files || files.length === 0) {
            return { success: false, message: "No files uploaded.", statusCode: 400 };
        }
        if (!year) {
            return { success: false, message: "Year is required.", statusCode: 400 };
        }
        if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
            return { success: false, message: "Valid Subject ID is required.", statusCode: 400 };
        }

        const subject = await Subject.findById(subjectId).select('name level group').lean();
        if (!subject) {
            return { success: false, message: "Subject not found.", statusCode: 404 };
        }

        // Fetch chapters for lookup
        const allChapters = await Chapter.find({ subjectId: subject._id }).select('name aliases _id').lean();

        const findChapterId = (nameQuery) => {
            if (!nameQuery) return null;
            const normalizedQuery = nameQuery.toLowerCase().trim();
            const match = allChapters.find(ch => {
                if (ch.name?.en?.toLowerCase() === normalizedQuery) return true;
                if (ch.name?.bn === nameQuery) return true;
                if (ch.aliases?.english?.some(a => a.toLowerCase() === normalizedQuery)) return true;
                if (ch.aliases?.bangla?.some(a => a === nameQuery)) return true;
                if (ch.aliases?.banglish?.some(a => a.toLowerCase() === normalizedQuery)) return true;
                return false;
            });
            return match ? match._id : null;
        };

        const results = [];
        // Process sequentially to manage resources
        for (const file of files) {
            try {
                const aiResponse = await aiService.extractBulkQuestion([file], { year, subjectName: subject.name.en });
                if (!aiResponse.success || !aiResponse.data) {
                    throw new Error("AI Extraction returned empty data.");
                }

                const aiData = aiResponse.data;
                const meta = aiData.extractedMetadata;
                const mainChapterId = findChapterId(meta.mainChapter);

                // Prepare Data
                const questionData = {
                    stem: aiData.stem,
                    a: { ...aiData.a, marks: 1, chapter: findChapterId(meta.partChapters?.a) },
                    b: { ...aiData.b, marks: 2, chapter: findChapterId(meta.partChapters?.b) },
                    c: { ...aiData.c, marks: 3, chapter: findChapterId(meta.partChapters?.c) },
                    d: { ...aiData.d, marks: 4, chapter: findChapterId(meta.partChapters?.d) },
                    source: {
                        source: {
                            sourceType: 'BOARD',
                            value: meta.board || 'Unknown Board',
                        },
                        year: parseInt(year),
                        examType: '',
                    },
                    meta: {
                        level: subject.level,
                        group: subject.group,
                        subject: { _id: subject._id, name: subject.name.en },
                        mainChapter: {
                            _id: mainChapterId,
                            name: meta.mainChapter
                        },
                        aliases: meta.aliases,
                        tags: meta.tags,
                    },
                    status: 'DRAFT',
                };

                if (!mainChapterId) {
                    // Log warning but allow creation? Or fail? 
                    // User requirement says "Identify the chapter name... according to NCTB".
                    // If we strictly fail, it might be annoying. But current schema REQUIRES mainChapter._id.
                    // So we must allow it to fail or skip.
                    // Let's throwing error for now as 'mainChapter' is required in Schema.
                    throw new Error(`Main Chapter '${meta.mainChapter}' not found in database.`);
                }

                const saveResult = await createQuestion(questionData);

                if (saveResult.success) {
                    results.push({ file: file.originalname, status: 'success', id: saveResult.data._id });
                } else {
                    results.push({ file: file.originalname, status: 'failed', message: saveResult.message, error: saveResult.error });
                }

            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                results.push({ file: file.originalname, status: 'failed', error: error.message });
            }
        }

        return { success: true, results };

    } catch (error) {
        console.error("Service Error - bulkIngestQuestions:", error);
        return { success: false, message: 'Bulk ingestion failed.', error: error.message };
    }
};