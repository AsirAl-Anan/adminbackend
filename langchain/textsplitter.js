import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import Subject from "../models/subject.model.js";
import { json } from "express";
import SubjectEmbedding from "../models/subject.embedding.model.js";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";


const splitText = async (req, res) => {
  try {
    const subjects = await Subject.find({});
    console.log(`Found ${subjects.length} subjects`);
    
    // const text = JSON.stringify(subjects);
    // console.log("text" , text)
    // const splitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 500,
    //   chunkOverlap: 20
    // });
    
    // const outputs = await splitter.createDocuments([text]);
    // console.log(`Created ${outputs.length} chunks`);
    
    // Test embedding dimensions first
    // const testEmbedding = await embeddings.embedQuery(outputs[0].pageContent);
    // console.log(`Embedding dimensions: ${testEmbedding.length}`);
    
    // // Clear existing embeddings for this subject (optional)
    // await SubjectEmbedding.deleteMany({ subjectName: "Physics First Paper" });
    
    // for (const output of outputs) {
    //   const embedding = await embeddings.embedQuery(output.pageContent);
      
    //   await SubjectEmbedding.create({
    //     subjectName: "Physics First Paper",
    //     chunkText: output.pageContent,
    //     embedding
    //   });
      
    //   console.log(`Saved chunk with ${embedding.length} dimensions`);
    // }
    
   return outputs
    
  } catch (error) {
    console.error("Error in splitText:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
splitText()