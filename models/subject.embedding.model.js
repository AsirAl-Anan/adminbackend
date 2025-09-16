import mongoose from "mongoose";

const subjectEmbeddingSchema = new mongoose.Schema({
  subject: { englishName: { type: String, required: true }, banglaName: { type: String, required: true } },
  // chapter: { englishName: { type: String, required: true }, banglaName: { type: String, required: true } },
  otherData:{ type: String, required: true },
  // topicId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  // segmentUniqueKey:{ type: String, required: true },
  chunkText: { type: String, required: true },
  embedding: { type: [Number], required: true }, // embedding vector array
});

const SubjectEmbedding = mongoose.model("SubjectEmbedding", subjectEmbeddingSchema);

export default SubjectEmbedding;
