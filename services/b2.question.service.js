import b2Question from "../models/b2.question.model.js";
import QuestionEmbedding from "../models/question.embedding.model.js";
import embeddings from "../services/aiEmbedding.service.js"; // Import your MistralAI embedding instance

/**
 * Creates a comprehensive string from a question object for embedding.
 * @param {Object} question - The b2Question document.
 * @returns {string} A concatenated string of important fields.
 */
const createEmbeddingText = (question) => {
    // Combine the most relevant fields to create a rich context for the embedding vector.
    return [
        question.question.questiontext,
        question.section,
        question.topic,
        question.questionType,
    ].join("\n"); // Using newline as a separator
};

/**
 * Service to create a new B2 Question and its corresponding embedding.
 * @param {Object} questionData - The data for the new question.
 * @returns {Promise<Object>} The created b2Question document.
 */
const createQuestion = async (questionData) => {
    let savedQuestion = null;
    try {
        const newQuestion = new b2Question(questionData);
        await newQuestion.validate();
        savedQuestion = await newQuestion.save();

        // 1. Generate text for embedding from the saved question
        const textToEmbed = createEmbeddingText(savedQuestion);

        // 2. Create the vector embedding
        const vector = await embeddings.embedQuery(textToEmbed);

        // 3. Save the embedding in the QuestionEmbedding collection
        const newEmbedding = new QuestionEmbedding({
            b2QuestionId: savedQuestion._id,
            embedding: vector,
        });
        await newEmbedding.save();

        return savedQuestion;
    } catch (error) {
        // If question was saved but embedding failed, roll back by deleting the question.
        if (savedQuestion && savedQuestion._id) {
            await b2Question.findByIdAndDelete(savedQuestion._id);
        }
        console.error("Error in createQuestion service:", error.message);
        throw error;
    }
};

/**
 * Service to retrieve all B2 Questions.
 * @returns {Promise<Array<Object>>} A list of b2Question documents.
 */
const getAllQuestions = async () => {
    try {
        const questions = await b2Question.find();
        return questions;
    } catch (error) {
        console.error("Error in getAllQuestions service:", error.message);
        throw error;
    }
};

/**
 * Service to retrieve a single B2 Question by its ID.
 * @param {string} id - The ID of the question to retrieve.
 * @returns {Promise<Object|null>} The b2Question document or null if not found.
 */
const getQuestionById = async (id) => {
    try {
        const question = await b2Question.findById(id);
        return question;
    } catch (error) {
        console.error("Error in getQuestionById service:", error.message);
        throw error;
    }
};

/**
 * Service to update an existing B2 Question and its embedding.
 * @param {string} id - The ID of the question to update.
 * @param {Object} updateData - The data to update the question with.
 * @returns {Promise<Object|null>} The updated b2Question document or null if not found.
 */
const updateQuestion = async (id, updateData) => {
    try {
        const updatedQuestion = await b2Question.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        if (updatedQuestion) {
            // If the update was successful, regenerate and update the embedding.
            const textToEmbed = createEmbeddingText(updatedQuestion);
            const vector = await embeddings.embedQuery(textToEmbed);

            // Use findOneAndUpdate with upsert:true.
            // This updates the existing embedding or creates one if it's missing.
            await QuestionEmbedding.findOneAndUpdate(
                { b2QuestionId: updatedQuestion._id },
                { $set: { embedding: vector } },
                { upsert: true, new: true }
            );
        }
        
        return updatedQuestion;
    } catch (error) {
        console.error("Error in updateQuestion service:", error.message);
        throw error;
    }
};

/**
 * Service to delete a B2 Question and its corresponding embedding.
 * @param {string} id - The ID of the question to delete.
 * @returns {Promise<Object|null>} The deleted b2Question document or null if not found.
 */
const deleteQuestion = async (id) => {
    try {
        // First, delete the question itself
        const deletedQuestion = await b2Question.findByIdAndDelete(id);

        if (deletedQuestion) {
            // If the question was deleted, also delete its corresponding embedding.
            await QuestionEmbedding.findOneAndDelete({ b2QuestionId: id });
        }

        return deletedQuestion;
    } catch (error) {
        console.error("Error in deleteQuestion service:", error.message);
        throw error;
    }
};

export default {
    createQuestion,
    getAllQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
};