// services/question.service.js
import CreativeQuestion from '../models/creativeQuestion.model.js'; // Ensure correct path
import { createEmbeddingForCreativeQuestions } from './aiRag.service.js';
import CreativeQuestionEmbedding from '../models/creativeQuestionEmbedding.model.js';
import { getQuestionFromEmbedding } from './aiRag.service.js';
// Create a new question
export const createQuestion = async (questionData) => {
  try {
    // Optional: Validate that subject, chapter, and topics exist and match
    // This requires fetching the Subject document and checking the chapter/topics
    // against the provided IDs. Omitted for brevity but recommended for data integrity.
    /*
    const subjectDoc = await Subject.findById(questionData.subject);
    if (!subjectDoc) {
        return { success: false, message: 'Subject not found.' };
    }
    const chapterDoc = subjectDoc.chapters.id(questionData.chapter.chapterId);
    if (!chapterDoc) {
         return { success: false, message: 'Chapter not found in the specified subject.' };
    }
    const cTopicDoc = chapterDoc.topics.id(questionData.cTopic.topicId);
    if (!cTopicDoc) {
         return { success: false, message: 'cTopic not found in the specified chapter.' };
    }
    if(questionData.d && questionData.dTopic.topicId) {
        const dTopicDoc = chapterDoc.topics.id(questionData.dTopic.topicId);
        if (!dTopicDoc) {
             return { success: false, message: 'dTopic not found in the specified chapter.' };
        }
    }
    // Similar checks for SubTopics if needed
    */
    const questionForEmbedding = {
      stem: questionData?.stem,
      a: questionData?.a,
      b: questionData?.b,
      c: questionData?.c,
      d: questionData?.d,
      
      aTopic: questionData?.aTopic,
      
      bTopic: questionData?.bTopic,

      cTopic: questionData?.cTopic,
      cSubTopic: questionData?.cSubTopic,
      dTopic: questionData?.dTopic,
      dSubTopic: questionData?.dSubTopic,
      
      difficulty: questionData?.difficulty,
      group: questionData?.group,
      level: questionData?.level,
      board: questionData?.board,
      institution: questionData?.institution,
      year: questionData?.year,
      
      
    }
    const newQuestion = new CreativeQuestion(questionData);
    const savedQuestion = await newQuestion.save();
    const embedding = await createEmbeddingForCreativeQuestions(questionForEmbedding);

    const newEmbedding = new CreativeQuestionEmbedding({
      creativeQuestionId: savedQuestion._id,
      embedding: embedding
    })

    await newEmbedding.save();
    console.log('New Embedding', newEmbedding)
    // Populate subject details for the response
    await savedQuestion.populate('subject', 'englishName banglaName');
    return { success: true, data: savedQuestion , embedding: embedding };
  } catch (error) {
    console.error("Service Error - Create Question:", error);
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation Error',
        error: error.message,
        details: Object.values(error.errors).map(e => e.message)
      };
    }
    // Custom errors from pre hooks
    if (error.message.includes('Topic') || error.message.includes('Answer') || error.message.includes('SubTopic')) {
      return { success: false, message: 'Validation Error', error: error.message };
    }
    return { success: false, message: 'Error creating question', error: error.message };
  }
};

// Get a single question by ID
export const getQuestionById = async (id) => {
  try {
    const question = await CreativeQuestion.findById(id).populate('subject', 'englishName banglaName');
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
    const questions = await CreativeQuestion.find({ subject: subjectId }).populate('subject', 'englishName banglaName');
    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Subject:", error);
    return { success: false, message: 'Error fetching questions by subject', error: error.message };
  }
};

// Get questions by subject ID, level, and optionally group (default group if not provided)
// Based on the frontend flow, group & level are selected first, then subject.
// This function allows filtering by subject (already selected) and level.
// Group is inherently tied to the subject via the Subject model.
export const getQuestionsBySubjectAndLevel = async (subjectId, level, group = null) => {
  try {
    const filter = { subject: subjectId, level: level };
    // If group is explicitly provided (though subject implies group), filter by it
    if (group) {
      filter.group = group;
    }
    const questions = await CreativeQuestion.find(filter).populate('subject', 'englishName banglaName');
    console.log("Questions fetched by subject and level:", questions);
    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Subject and Level:", error);
    return { success: false, message: 'Error fetching questions by subject and level', error: error.message };
  }
};

// Get questions by various filters (topic, board, year, etc.)
export const getQuestionsByFilters = async (filters) => {
  try {
    // Build dynamic filter object
    const query = {};
    // Handle simple string/number/enum filters
    const simpleFilters = ['board', 'year', 'difficulty', 'level', 'group', 'version', 'institution'];
    simpleFilters.forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query[key] = filters[key];
      }
    });

    // Handle subject filter
    if (filters.subject) {
      query.subject = filters.subject;
    }

    // Handle chapter filter (search by chapterId)
    if (filters.chapterId) {
      query['chapter.chapterId'] = filters.chapterId;
    }

    // Handle topic filters (search by topicId within cTopic, dTopic, cSubTopic, dSubTopic)
    if (filters.topicId) {
      query.$or = [
        { 'cTopic.topicId': filters.topicId },
        { 'dTopic.topicId': filters.topicId },
        { 'cSubTopic.topicId': filters.topicId }, // Add cSubTopic
        { 'dSubTopic.topicId': filters.topicId }  // Add dSubTopic
      ];
    }

    // Handle search by topic name (English or Bangla) - less precise than ID
    if (filters.topicName) {
      query.$or = [
        { 'cTopic.englishName': new RegExp(filters.topicName, 'i') },
        { 'cTopic.banglaName': new RegExp(filters.topicName, 'i') },
        { 'dTopic.englishName': new RegExp(filters.topicName, 'i') },
        { 'dTopic.banglaName': new RegExp(filters.topicName, 'i') },
        { 'cSubTopic.englishName': new RegExp(filters.topicName, 'i') }, // Add cSubTopic
        { 'cSubTopic.banglaName': new RegExp(filters.topicName, 'i') },   // Add cSubTopic
        { 'dSubTopic.englishName': new RegExp(filters.topicName, 'i') },  // Add dSubTopic
        { 'dSubTopic.banglaName': new RegExp(filters.topicName, 'i') }    // Add dSubTopic
      ];
    }

    // Handle year range if needed (example)
    // if (filters.yearFrom && filters.yearTo) {
    //     query.year = { $gte: filters.yearFrom, $lte: filters.yearTo };
    // } else if (filters.yearFrom) {
    //     query.year = { $gte: filters.yearFrom };
    // } else if (filters.yearTo) {
    //     query.year = { $lte: filters.yearTo };
    // }

    // Handle filtering by aCommon or bCommon if needed (more complex)
    // Example: Find questions where 'a' was used in Dhaka board in 2020
    // This would require filters like aBoard=Dhaka&aYear=2020
    if (filters.aBoard && filters.aYear) {
        query['aCommon'] = {
            $elemMatch: {
                board: filters.aBoard,
                year: parseInt(filters.aYear, 10) // Ensure year is a number
            }
        };
    } else if (filters.aBoard) {
         query['aCommon.board'] = filters.aBoard;
    } else if (filters.aYear) {
         query['aCommon.year'] = parseInt(filters.aYear, 10); // Ensure year is a number
    }

    if (filters.bBoard && filters.bYear) {
        query['bCommon'] = {
            $elemMatch: {
                board: filters.bBoard,
                year: parseInt(filters.bYear, 10) // Ensure year is a number
            }
        };
    } else if (filters.bBoard) {
         query['bCommon.board'] = filters.bBoard;
    } else if (filters.bYear) {
         query['bCommon.year'] = parseInt(filters.bYear, 10); // Ensure year is a number
    }


    console.log("Constructed Query:", JSON.stringify(query, null, 2)); // For debugging

    const questions = await CreativeQuestion.find(query)
      .populate('subject', 'englishName banglaName')
      .sort({ createdAt: -1 }); // Sort by newest first

    return { success: true, data: questions, count: questions.length };
  } catch (error) {
    console.error("Service Error - Get Questions By Filters:", error);
    return { success: false, message: 'Error fetching questions by filters', error: error.message };
  }
};

// Update a question by ID
export const updateQuestion = async (id, updateData) => {
  try {
    // Similar validation as create could be done here if needed before update
    const updatedQuestion = await CreativeQuestion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true } // Return updated doc and run validation
    ).populate('subject', 'englishName banglaName');

    if (!updatedQuestion) {
      return { success: false, message: 'Question not found' };
    }
    return { success: true, data: updatedQuestion };
  } catch (error) {
    console.error("Service Error - Update Question:", error);
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation Error',
        error: error.message,
        details: Object.values(error.errors).map(e => e.message)
      };
    }
    if (error.message.includes('Topic') || error.message.includes('Answer') || error.message.includes('SubTopic')) {
      return { success: false, message: 'Validation Error', error: error.message };
    }
    return { success: false, message: 'Error updating question', error: error.message };
  }
};

// Delete a question by ID
export const deleteQuestion = async (id) => {
  try {
    const question = await CreativeQuestion.findById(id);

   if(!question){
    return { success: false, message: 'Question not found' };
   }
    const deletedQuestion = await CreativeQuestion.findByIdAndDelete(id);

    const siblingQuestion = await CreativeQuestion.findOneAndDelete({uniqueKey: question.uniqueKey})
    console.log(siblingQuestion)
    if (!deletedQuestion) {
      return { success: false, message: 'Question not found' };
    }
    return { success: true, message: 'Question deleted successfully', data: deletedQuestion };
  } catch (error) {
    console.error("Service Error - Delete Question:", error);
    return { success: false, message: 'Error deleting question', error: error.message };
  }
};
