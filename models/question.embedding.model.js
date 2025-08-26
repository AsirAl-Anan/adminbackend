import mongoose, { Schema } from "mongoose";

const questionEmbeddingSchame = new Schema({
    creativeQuestionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "CreativeQuestion", 
        required: true 
    },
    embedding: { 
        type: [Number], // vector array
        required: true 
    }
}, { timestamps: true });

const QuestionEmbedding  = mongoose.model("QuestionEmbedding", questionEmbeddingSchame);

export default QuestionEmbedding;
