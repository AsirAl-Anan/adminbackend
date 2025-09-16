// services/question.service.js
import CreativeQuestion from '../models/creativeQuestion.model.js';
import QuestionEmbedding from '../models/question.embedding.model.js';
import { createEmbeddingForCreativeQuestions } from './aiRag.service.js';
// To use validation, uncomment these imports
 import Subject from '../models/subject.model.js';
 import Topic from '../models/topic.model.js';
import { version } from 'mongoose';

import mongoose from 'mongoose';
// Helper to transform new schema data into the flat structure expected by the embedding service
const buildEmbeddingObject = (questionData) => {
  const embeddingData = {
    stem: questionData.stem,
    difficulty: questionData.difficulty,
    group: questionData.group,
    level: questionData.level,
    board: questionData.board,
    institution: questionData.institution ? questionData.institution.name : undefined,
    year: questionData.year,
    a: questionData.a,
    b: questionData.b,
    c: questionData.c,
    cTopic: questionData.cTopic ? {
      englishName: questionData.cTopic.englishName,
      banglaName: questionData.cTopic.banglaName,
    } : undefined,
    version: questionData?.version,
  };

  if (questionData.d) {
    embeddingData.d = questionData.d;
  }
  if (questionData.dTopic) {
    embeddingData.dTopic = {
      englishName: questionData.dTopic.englishName,
      banglaName: questionData.dTopic.banglaName,
    };
  }
  if(questionData.cType){ 
    embeddingData.cType = questionData.cType;
  }
  if(questionData.dType){
    embeddingData.dType = questionData.dType;
  }

  Object.keys(embeddingData).forEach(key => embeddingData[key] === undefined && delete embeddingData[key]);
  
  return embeddingData;
};


// Create a new question
// Create a new question (UPDATED with Transaction)
export const createQuestion = async (questionData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --- (Your existing parsing logic) ---
    ['institution', 'chapter', 'cTopic', 'dTopic'].forEach(field => {
      if (questionData[field] && typeof questionData[field] === 'string') {
        try { questionData[field] = JSON.parse(questionData[field]); }
        catch (e) { console.error(`Failed to parse ${field}:`, questionData[field]); }
      }
    });
    if (questionData.cAnswerImage && questionData.cAnswerImage.length > 0) { questionData.cAnswerImage = questionData.cAnswerImage[0]; } else { delete questionData.cAnswerImage; }
    if (questionData.dAnswerImage && questionData.dAnswerImage.length > 0) { questionData.dAnswerImage = questionData.dAnswerImage[0]; } else { delete questionData.dAnswerImage; }
    if (questionData.stemImage && questionData.stemImage.length > 0) { questionData.stemImage = questionData.stemImage[0]; } else { delete questionData.stemImage; }
    
    // 1. Create the new question within the transaction
    // Using create() with a session is a concise way to handle this
    const newQuestionArray = await CreativeQuestion.create([questionData], { session });
    const savedQuestion = newQuestionArray[0];

    // 2. Generate the embedding
    const questionForEmbedding = buildEmbeddingObject(savedQuestion.toObject());
    const embedding = await createEmbeddingForCreativeQuestions(questionForEmbedding);

    // 3. Create and save the new embedding within the transaction
    const newEmbedding = new QuestionEmbedding({
      creativeQuestionId: savedQuestion._id,
      embedding: embedding
    });
    await newEmbedding.save({ session });
    
    // 4. If all operations succeed, commit the transaction
    await session.commitTransaction();
    
    // Populate after commit for the final response
    await savedQuestion.populate('subject', 'englishName banglaName');
    
    return { success: true, data: savedQuestion, embedding: embedding };

  } catch (error) {
    // If any step fails, abort the entire transaction
    await session.abortTransaction();
    
    console.error("Service Error - Create Question:", error);
    if (error.name === 'ValidationError') {
      return { success: false, message: 'Validation Error', error: error.message, details: Object.values(error.errors).map(e => e.message) };
    }
    return { success: false, message: 'Error creating question', error: error.message };
  } finally {
    // Always end the session
    session.endSession();
  }
};

// Get a single question by ID
export const getQuestionById = async (id) => {
  try {
    const question = await CreativeQuestion.findById(id)
      .populate('subject', 'englishName banglaName');
      
    if (!question) {
      return { success: false, message: 'Question not found' };
    }
    return { success: true, data: question };
  } catch (error) {
    console.error("Service Error - Get Question By ID:", error);
    return { success: false, message: 'Error fetching question', error: error.message };
  }
};

// Get questions by subject ID
export const getQuestionsBySubject = async (subjectId) => {
  try {
    const questions = await CreativeQuestion.find({ subject: subjectId })
      .populate('subject', 'englishName banglaName');
      
    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Subject:", error);
    return { success: false, message: 'Error fetching questions by subject', error: error.message };
  }
};

// Get questions by subject ID, level, and optionally group
export const getQuestionsBySubjectAndLevel = async (subjectId, level, group = null) => {
  try {
    const filter = { subject: subjectId, level: level };
    if (group) {
      filter.group = group;
    }
    const questions = await CreativeQuestion.find(filter)
      .populate('subject', 'englishName banglaName');

    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Subject and Level:", error);
    return { success: false, message: 'Error fetching questions by subject and level', error: error.message };
  }
};

// Get questions by various filters
export const getQuestionsByFilters = async (filters) => {
  try {
    const query = {};
    const simpleFilters = ['board', 'year', 'difficulty', 'level', 'group', 'version', 'subject'];
    simpleFilters.forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query[key] = filters[key];
      }
    });
    
    if (filters.institution) {
        query['institution.name'] = new RegExp(filters.institution, 'i');
    }

    if (filters.chapterId) {
      query['chapter.chapterId'] = filters.chapterId;
    }

    const topicConditions = [];
    if (filters.topicId) {
      topicConditions.push({ 'cTopic.topicId': filters.topicId });
      topicConditions.push({ 'dTopic.topicId': filters.topicId });
    } else if (filters.topicName) {
      const topicNameRegex = new RegExp(filters.topicName, 'i');
      topicConditions.push({ 'cTopic.englishName': topicNameRegex });
      topicConditions.push({ 'cTopic.banglaName': topicNameRegex });
      topicConditions.push({ 'dTopic.englishName': topicNameRegex });
      topicConditions.push({ 'dTopic.banglaName': topicNameRegex });
    }

    if (topicConditions.length > 0) {
      query.$or = topicConditions;
    }

    console.log("Constructed Query:", JSON.stringify(query, null, 2));

    const questions = await CreativeQuestion.find(query)
      .populate('subject', 'englishName banglaName')
      .sort({ createdAt: -1 });

    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Filters:", error);
    return { success: false, message: 'Error fetching questions by filters', error: error.message };
  }
};

// Update a question by ID
export const updateQuestion = async (id, updateData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --- (Your existing parsing logic) ---
    ['institution', 'chapter', 'cTopic', 'dTopic'].forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try { updateData[field] = JSON.parse(updateData[field]); }
        catch (e) { console.error(`Failed to parse ${field} on update:`, updateData[field]); }
      }
    });

    // 1. Update the question document within the transaction
    const updatedQuestion = await CreativeQuestion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true, session } // Pass the session here
    );

    if (!updatedQuestion) {
      throw new Error('Question not found'); // This will trigger the catch block and abort the transaction
    }

    // 2. Delete the old embedding to ensure no stale data
    await QuestionEmbedding.findOneAndDelete({ creativeQuestionId: id }, { session });

    // 3. Prepare and generate the new embedding from updated data
    const questionForEmbedding = buildEmbeddingObject(updatedQuestion.toObject());
    const newEmbeddingVector = await createEmbeddingForCreativeQuestions(questionForEmbedding);

    // 4. Create and save the new embedding document
    const newEmbedding = new QuestionEmbedding({
      creativeQuestionId: updatedQuestion._id,
      embedding: newEmbeddingVector
    });
    await newEmbedding.save({ session });
    
    // 5. If all succeeds, commit the transaction
    await session.commitTransaction();

    // Populate after commit for the final response
    await updatedQuestion.populate('subject', 'englishName banglaName');
    
    return { success: true, data: updatedQuestion };

  } catch (error) {
    // If any step fails, abort the entire transaction
    await session.abortTransaction();
    
    console.error("Service Error - Update Question:", error);
    if (error.message === 'Question not found') {
        return { success: false, message: 'Question not found' };
    }
    if (error.code === 11000) { /* ... your existing unique key error handling ... */ }
    if (error.name === 'ValidationError') { /* ... your existing validation error handling ... */ }
    return { success: false, message: 'Error updating question', error: error.message };
  } finally {
    // Always end the session
    session.endSession();
  }
};


// Delete a question by ID
export const deleteQuestion = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Attempt to delete the question document
    const deletedQuestion = await CreativeQuestion.findByIdAndDelete(id, { session });

    // If no document was found and deleted, throw an error to abort
    if (!deletedQuestion) {
      throw new Error('Question not found');
    }

    // 2. Delete the associated embedding
    await QuestionEmbedding.findOneAndDelete({ creativeQuestionId: id }, { session });

    // 3. If both operations were successful, commit the transaction
    await session.commitTransaction();

    return { success: true, message: 'Question and its embedding deleted successfully', data: deletedQuestion };
  } catch (error) {
    // If anything fails (e.g., question not found), abort the transaction
    await session.abortTransaction();
    
    console.error("Service Error - Delete Question:", error);
    if (error.message === 'Question not found') {
        return { success: false, message: 'Question not found' };
    }
    return { success: false, message: 'Error deleting question', error: error.message };
  } finally {
    // Always end the session
    session.endSession();
  }
};

