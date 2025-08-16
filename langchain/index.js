import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import Subject from "../models/subject.model.js";
import { json } from "express";
import embeddings from "../services/aiEmbedding.service.js";
import SubjectEmbedding from "../models/subject.embedding.model.js";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";

const splitText = async (req, res) => {
  try {
    const subjects = await Subject.find({});
    
    
 
    const chapters = subjects[0].chapters.toObject()
    
    
    
    // // Clear existing embeddings for this subject (optional)
     await SubjectEmbedding.deleteMany({ subjectName: "Physics First Paper" });
    
   
    for(const chapter of chapters){
      for(const topic of chapter.topics){
 topic.subject = {englishName:subjects[0].englishName, banglaName: subjects[0].banglaName}
 topic.chapter= {englishName:chapter.englishName, banglaName: chapter.banglaName}
         const topicStr = JSON.stringify(topic);
         
         console.log(topicStr);
       const embedding = await embeddings.embedQuery(topicStr);
       await SubjectEmbedding.create({
         subject: {
           englishName: "Physics First Paper",
           banglaName: "Physics First Paper"
         },
         chunkText: topicStr,
         embedding
       });
       console.log(`Saved topic with ${embedding.length} dimensions`);
       }
    }
    
    res.json({
      success: true,
      message: `Successfully processed ${chapters.length} chunks`,
    });
    
  } catch (error) {
    console.error("Error in splitText:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function searchSimilarChunks(query, topK = 5) {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db("test");
    const collection = db.collection("subjectembeddings");

    // Test query embedding dimensions
 

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: "vector_index",
      textKey: "chunkText",
      embeddingKey: "embedding",
    });

    const results = await vectorStore.similaritySearch(query, topK);
    console.log("Search results:", results);

    return results;
    
  } catch (error) {
    console.error("Error in searchSimilarChunks:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Helper function to check embedding dimensions
async function checkEmbeddingDimensions() {
  try {
    const testQuery = "test";
    const embedding = await embeddings.embedQuery(testQuery);
    console.log(`Current embedding service produces ${embedding.length} dimensions`);
    return embedding.length;
  } catch (error) {
    console.error("Error checking embedding dimensions:", error);
    throw error;
  }
}

export default splitText;
export { searchSimilarChunks };