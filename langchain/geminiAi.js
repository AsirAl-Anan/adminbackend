import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {PromptTemplate} from "@langchain/core/prompts";
import embeddings from "../services/aiEmbedding.service.js";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence , RunnablePassthrough} from "@langchain/core/runnables";
const apiKey = "AIzaSyCK6WyD3zCd_gl93uO3wj7VKhOho3Pr5e8";
const model = "gemini-2.5-flash-lite";

export const testing = async (req,res) =>{
    try {
//         const client = new MongoClient(process.env.MONGODB_URI || "");
// const collection = client.db('test').collection('subjectembeddings')
// const vectorStore = new MongoDBAtlasVectorSearch(embeddings,{
// collection,
// indexName: "vector_index",
// textKey: "chunkText",
// embeddingKey: "embedding",
// })
// const retriever = vectorStore.asRetriever()
// const answerTemplate = "You are a helpful ai who is a HSC teacher. Try to understand the question from the topic and the question. From the given chunks of probable user topic, answer to the topic and chapter  which is more accurate accorind the user question  Topics:{topic} Question:{question}";
// const llm = new ChatGoogleGenerativeAI({
//     model: model,
//     apiKey: apiKey
// })
// const prompTemplate = "create a standalone question from this  user {query} and then also  pass the metadatas like subject and topic";

// const prompt = PromptTemplate.fromTemplate(prompTemplate)
// const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)
// function combineDocuments(docs){
//     return docs.map((doc) => {
//         return `topic name is ${doc.pageContent.englishName} in english and ${doc.pageContent.banglaName} in bangla. Chapter Name is ${doc.metadata.chapter.englishName} in english and ${doc.metadata.chapter.banglaName} in bangla. And subject is ${doc.metadata.subject.englishName} in english and ${doc.metadata.subject.banglaName} in bangla.`
//     })
// }
// const outPutParser = new StringOutputParser();
// const chain = prompt.pipe(llm).pipe(outPutParser).pipe(retriever).pipe(combineDocuments);
// const res2 = await retriever.invoke("vector")
// const response = await chain.invoke({
//      query:"Im learning about some topics of physics, but I find it kind of hard. Like what is the meaning of dew? and where is should be applied"
//  })
// const answerChain = answerPrompt.pipe(llm).pipe(outPutParser)
// console.log(response)
// const answerResponse = await answerChain.invoke({
//     topic:response,
//     question:"Im learning about some topics of physics, but I find it kind of hard. Like what is the meaning of dew? and where is should be applied"

// })

 const client = new MongoClient(process.env.MONGODB_URI || "");
const collection  = client.db('test').collection('subjectembeddings')
    const llm = new ChatGoogleGenerativeAI({
        model: model,
        apiKey: apiKey
    
    })


   const punctuationTemplate = "Given a sentence, add correct punctuation to it. Order to follow: Talk less and just do what is told. Sentence: {sentence}"
   const punctuationprompt  = PromptTemplate.fromTemplate(punctuationTemplate) 
  const outPutParser = new StringOutputParser();
   const grammerTemplate = "Given a sentence, add correct grammar to it.Order to follow: talk less and just do what is told . Sentenc: {correctPunctuatedSentence}"
    const punctuationChain = RunnableSequence.from([
 punctuationprompt,
        llm,
        outPutParser,
        ])
        
   const grammerPrompt = PromptTemplate.fromTemplate(grammerTemplate)
      const grammerChain = grammerPrompt.pipe(llm).pipe(outPutParser)
      const translationTemplate = "given a sentence translate it to {language}, no matter whatever the sentence is. Order: Talk less and just do what is told. sentence:{fullyCorrectedSentence}"
      const translationPrompt = PromptTemplate.fromTemplate(translationTemplate)
      const translationChain = RunnableSequence.from([
        translationPrompt,
        llm,
        outPutParser
      ])
      const chain = RunnableSequence.from([
       
        {correctPunctuatedSentence: punctuationChain,
            original_input: new RunnablePassthrough()
        },
       
       {fullyCorrectedSentence: grammerChain, 
        language: (({original_input})=> (original_input.language) )
       },
       { translationChain,
         
       },
       

      ])
 
      const response = await chain.invoke({
        sentence:"Im learning about some topics of physics, but I find it kind of hard. Like what is the meaning of dew? and where is should be applied",
        language:"latin"
    })
      console.log(response)
} catch (error) {
            console.error("Error in splitText:", error);
            
    }
}
