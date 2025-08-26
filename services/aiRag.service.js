import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { MongoClient } from "mongodb";
import embeddings from "./aiEmbedding.service.js";
import SubjectEmbedding from "../models/subject.embedding.model.js";
import { RunnableSequence , RunnablePassthrough} from "@langchain/core/runnables";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {PromptTemplate} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {createEmbedingsForSubjectsChaptersAndTopics} from "../controllers/ai.controller.js";

export const findSimilarDocsBySubjectChapterAndTopic = async (query, topK = 5, includeScores = false) => {
  const client = new MongoClient(process.env.MONGODB_URI || "");
  try {
    const collection = client
      .db('test')
      .collection('subjectembeddings');

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "chunkText", // Changed from "text" to match your model
      embeddingKey: "embedding",
    });

    let similarResults;
    
    if (includeScores) {
      // Get results with similarity scores
      similarResults = await vectorStore.similaritySearchWithScore(query, topK);
      return similarResults.map(([doc, score]) => ({
        document: doc,
        score: score,
        content: doc.pageContent,
        metadata: doc.metadata
      }));
    } else {
      // Get results without scores
      similarResults = await vectorStore.similaritySearch(query, topK);
      return similarResults.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        subject: doc.metadata?.subject,
        chapter: doc.metadata?.chapter
      }));
    }
    
  } catch (error) {
    console.error("Error in findSimilarDocsBySubjectChapterAndTopic:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Alternative: Get documents with parsed JSON content
export const findSimilarDocsWithParsedContent = async (query, topK = 5) => {
  const client = new MongoClient(process.env.MONGODB_URI || "");
  try {
    console.log("Query received:", query);
    const collection = client
      .db('test')
      .collection('subjectembeddings');

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "chunkText",
      embeddingKey: "embedding",
    });

    const similarResults = await vectorStore.similaritySearch(query, topK);
    console.log("vector result ", similarResults)
    return similarResults.map(doc => {
      try {
        // Parse the JSON content since you're storing stringified topic objects
        const parsedContent = JSON.parse(doc.pageContent);
        console.log("pasrsed",parsedContent)
        return {
          topic: parsedContent,
          subject: parsedContent.subject,
          chapter: parsedContent.chapter,
          metadata: doc.metadata
        };
      } catch (parseError) {
        console.warn("Could not parse content as JSON:", parseError);
        return {
          rawContent: doc.pageContent,
          metadata: doc.metadata
        };
      }
    });
    
  } catch (error) {
    console.error("Error in findSimilarDocsWithParsedContent:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Get documents filtered by subject
export const findSimilarDocsBySubject = async (query, subjectName, topK = 5) => {
  const client = new MongoClient(process.env.MONGODB_URI || "");
  try {
    const collection = client
      .db('test')
      .collection('subjectembeddings');

    // First filter by subject, then perform vector search
    const filter = {
      "subject.englishName": subjectName
    };

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "chunkText",
      embeddingKey: "embedding",
    });

    // Use the filter parameter in similarity search
    const similarResults = await vectorStore.similaritySearch(query, topK, filter);
    
    return similarResults.map(doc => {
      try {
        const parsedContent = JSON.parse(doc.pageContent);
        return {
          topic: parsedContent,
          subject: parsedContent.subject,
          chapter: parsedContent.chapter,
          rawContent: doc.pageContent
        };
      } catch (parseError) {
        return {
          rawContent: doc.pageContent,
          metadata: doc.metadata
        };
      }
    });
    
  } catch (error) {
    console.error("Error in findSimilarDocsBySubject:", error);
    throw error;
  } finally {
    await client.close();
  }
}

export const createEmbeddingsForSubjectsChaptersAndTopics = async (subject) => {
  try {
     const chapters = subject.chapters;
     await SubjectEmbedding.deleteMany({
       "subject.englishName": subject.englishName
     });
const llm = new ChatGoogleGenerativeAI({
  temperature: 0.5,
  model:"gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
})
const promptTemplate = "you are a description summarizer whose job is to summarize the paragraph in to a single sentence according to the language(bangla or enlish). You should talk less and just do what is required to do. Paragraph: {input}, language:{language}"
const prompt = PromptTemplate.fromTemplate(
  promptTemplate
)
const chain =  RunnableSequence.from([
  prompt,
  
  llm,
  
  new StringOutputParser()
])
    for (const chapter of chapters) {
      for (const topic of chapter.topics) {
        topic.subject = {
          englishName: subject.englishName, 
          banglaName: subject.banglaName
        };
        topic.chapter = {
          englishName: chapter.englishName, 
          banglaName: chapter.banglaName
        };
        topic.topicId = topic._id;
        const newEnglishDescription = await chain.invoke({
          input: topic.englishDescription,
          language: "english"
        })
        topic.englishDescription = newEnglishDescription;
        const newBanglaDescription = await chain.invoke({
          input: topic.banglaDescription,
          language: "bangla"
        })
        topic.banglaDescription = newBanglaDescription;
        
        const topicStr = JSON.stringify(topic);
        
        
        const topicToBeSaved = {
          englishName: topic.englishName,
          banglaName: topic.banglaName,
          topicId: topic._id,

          
        }
        
        const embedding = await embeddings.embedQuery(topicStr);
        let topicToBeSavedStr = JSON.stringify(topicToBeSaved);
        await SubjectEmbedding.create({
          subject: {
            englishName: subject.englishName,
            banglaName: subject.banglaName,
          },
          chapter:{
            englishName: chapter.englishName,
            banglaName: chapter.banglaName
          },
          topicId: topic._id,
          chunkText: topicToBeSavedStr,
          embedding
        });
      }
    }
  } catch (error) {
    console.error("Error in createEmbeddingsForSubjectsChaptersAndTopics:", error);
    throw error;
  }
}
export const createEmbeddingForCreativeQuestions =(question) =>{
  const questionStr = JSON.stringify(question);
  console.log(questionStr)
  return embeddings.embedQuery(questionStr);
}
export const createEmbeddingsForSegment = async (segment) => {
  try {
    const segmentStr = JSON.stringify(segment);
    const embedding = await embeddings.embedQuery(segmentStr);
    return embedding
  } catch (error) {
    return error
  }
}
export const getQuestionFromEmbedding  = async (question) =>{

  try {
    const client = new MongoClient(process.env.MONGODB_URI || "");
    const collection = client.db('test').collection('questionembeddings')
    const questionStr = JSON.stringify(question);
    const embedding = await embeddings.embedQuery(questionStr);
  
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "chunkText",
      embeddingKey: "embedding",
    });
    const similarResults = await vectorStore.similaritySearch(questionStr, 5);
    console.log(similarResults)
    const results = similarResults.map(doc => ({
     
      creativeQuestionId: doc.metadata.creativeQuestionId,
    
    }));
    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error("Error in getQuestionFromEmbedding:", error);
    throw error;
    
  }
}

export const createEmbeddings = async (data)=> {
const newEmbeddings = await embeddings.embed( data)
return newEmbeddings
}