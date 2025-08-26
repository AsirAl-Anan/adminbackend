import mongoose from "mongoose";
const chapterSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  englishName: String,
  banglaName: String,
  index: Number,
});


const Chapter = mongoose.model("Chapter", chapterSchema);
export default Chapter;