import mongoose, { Schema } from "mongoose";

const creativeQuestionEmbeddingSchema = new Schema({
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

const CreativeQuestionEmbedding = mongoose.model("CreativeQuestionEmbedding", creativeQuestionEmbeddingSchema);

export default CreativeQuestionEmbedding;
