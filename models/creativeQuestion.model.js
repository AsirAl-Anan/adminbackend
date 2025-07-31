// models/CreativeQuestion.js
import mongoose from "mongoose";

const creativeQuestionSchema = new mongoose.Schema({
  uniqueKey: { 
    type: String,
    required: true,
    unique: true,
  },
  stem: {
    type: String,
    required: true,
  },
  
  a: {
    type: String,
    required: true,
  },
  stemImage:{
    type: String, // Optional image for the question stem
  },
  aTopic: { 
    topicId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Optional
    englishName: { type: String, required: false },
    banglaName: { type: String, required: false },
  },
  // New array for a's board/year info
 
  b: {
    type: String,
    required: true,
  },
  bTopic:{
  topicId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Optional
    englishName: { type: String, required: false },
    banglaName: { type: String, required: false },
  },
  bSubTopic:{
  topicId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Optional
    englishName: { type: String, required: false },
    banglaName: { type: String, required: false },
  },
 
  // New array for b's board/year info
 
  c: {
    type: String,
    required: true,
  },
  cAnswerImage:{
    type: String,
  },
  // Store reference to the topic within the selected chapter
  cTopic: {
    topicId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to topic _id in Subject.chapters[].topics[]
    englishName: { type: String, required: true },
    banglaName: { type: String, required: true },
  },
  // New optional subtopic for c
  cSubTopic: {
    topicId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Optional
    englishName: { type: String, required: false },
    banglaName: { type: String, required: false },
  },
  d: {
    type: String,
  },
  dAnswerImage: {
    type: String,
  },
  // Store reference to the topic within the selected chapter
  dTopic: {
    topicId: { type: mongoose.Schema.Types.ObjectId }, // Required only if 'd' exists
    englishName: { type: String },
    banglaName: { type: String },
  },
  // New optional subtopic for d
  dSubTopic: {
    topicId: { type: mongoose.Schema.Types.ObjectId, required: false }, // Optional
    englishName: { type: String, required: false },
    banglaName: { type: String, required: false },
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  group: {
    type: String,
    enum: ['science', 'arts', 'commerce'],
    required: true,
  },
  board: {
    type: String,
    enum: [
      'Dhaka', 'Rajshahi', 'Chittagong', 'Barisal',
      'Sylhet', 'Comilla', 'Jessore', 'Dinajpur',
      'Mymensingh', 'Madrasah', 'Barishal'
    ],
    
  },
  institution: {
    type: String,
    default: 'None',
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2099,
  },
  // Assuming answers are structured or plain text
  aAnswer: { type: String, required: true },
  bAnswer: { type: String, required: true },
  cAnswer: { type: String, required: true },
  cAnswerImage: { type: String }, // Optional image for c's answer
  dAnswer: { type: String }, // Required if 'd' exists
  dAnswerImage: { type: String }, // Optional image for d's answer
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  level: {
    type: String,
    enum: ['SSC', 'HSC'],
    required: true,
  },
  version: {
    type: String,
    enum: ['Bangla', "English"],
    required: true,
  },
  // Store reference to the chapter within the selected subject
  chapter: {
    chapterId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to chapter _id in Subject.chapters[]
    englishName: { type: String, required: true },
    banglaName: { type: String, required: true },
  }
}, {
  timestamps: true,
});

// Add a pre-save hook to ensure dTopic, dSubTopic and dAnswer are required if 'd' is provided
creativeQuestionSchema.pre('save', function (next) {
  if (this.d) {
    if (!this.dTopic || !this.dTopic.topicId) {
      return next(new Error("dTopic.topicId is required when 'd' field is provided."));
    }
    if (!this.dAnswer) {
      return next(new Error("dAnswer is required when 'd' field is provided."));
    }
    // dSubTopic is optional, so no check needed for its existence or fields
  }
  next();
});

// Add a pre-validate hook to ensure dTopic and cTopic details are provided
creativeQuestionSchema.pre('validate', function (next) {
  // Validate cTopic always
  if (!this.cTopic || !this.cTopic.topicId || !this.cTopic.englishName || !this.cTopic.banglaName) {
    return next(new Error("cTopic.topicId, cTopic.englishName, and cTopic.banglaName are required."));
  }

  // Validate dTopic details if 'd' exists
  if (this.d && (!this.dTopic || !this.dTopic.englishName || !this.dTopic.banglaName)) {
    return next(new Error("dTopic englishName and banglaName are required when 'd' field is provided."));
  }

  // Validate cSubTopic details if cSubTopic exists (i.e., topicId is present)
  if (this.cSubTopic && this.cSubTopic.topicId) {
    if (!this.cSubTopic.englishName || !this.cSubTopic.banglaName) {
      return next(new Error("If cSubTopic.topicId is provided, cSubTopic.englishName and cSubTopic.banglaName are required."));
    }
  }

  // Validate dSubTopic details if dSubTopic exists (i.e., topicId is present)
  if (this.d && this.dSubTopic && this.dSubTopic.topicId) {
    if (!this.dSubTopic.englishName || !this.dSubTopic.banglaName) {
      return next(new Error("If dSubTopic.topicId is provided, dSubTopic.englishName and dSubTopic.banglaName are required."));
    }
  }

  next();
});

// Optional: Add indexes for better query performance on frequently searched fields like topic IDs
// creativeQuestionSchema.index({ 'cTopic.topicId': 1 });
// creativeQuestionSchema.index({ 'dTopic.topicId': 1 });
// creativeQuestionSchema.index({ 'cSubTopic.topicId': 1 });
// creativeQuestionSchema.index({ 'dSubTopic.topicId': 1 });

const CreativeQuestion = mongoose.model('CreativeQuestion', creativeQuestionSchema);
export default CreativeQuestion;
