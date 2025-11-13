// models/CreativeQuestion.js
import mongoose from "mongoose";

// Constants for enums
const BOARDS = [
  'Dhaka', 'Rajshahi', 'Chittagong', 
  'Sylhet', 'Comilla', 'Jessore', 'Dinajpur',
  'Mymensingh', 'Madrasah', 'Barishal'
];
const GROUPS = ['science', 'arts', 'commerce'];
const LEVELS = ['SSC', 'HSC'];
const VERSIONS = ['Bangla', 'English'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const textSchema = new mongoose.Schema({
  english: { type: String },
  bangla: { type: String },

})
const stemSchema = new mongoose.Schema({
  text:textSchema,
  images: [
    {
      url: { type: String, required: true },
      caption: { en: String, bn: String },
      order: Number,
    },
  ],
  order:{
    type: Number,
     required: true,
  }
})
const partSchema = new mongoose.Schema({
  question:[
     {
   text:textSchema,
    images: [
      {
        url: { type: String, required: true },
        caption: { en: String, bn: String },
        order: Number,
      },
    ],
    order:{
      type: Number,
       required: true,
    }
  },
  ],
  marks: { type: Number, required: true },
  chapter:{
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  },
   topics:[
    {
      topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
      weight:{
        type: Number,
        default: 1
      }
    }
   ],
   types:{ //types are stored in topic model
    type: [String],
    default: []
   },
  answer: [{
    text:textSchema,
    images: [
      {
        url: { type: String, required: true },
        caption: { en: String, bn: String },
        order: Number,
      },
    ],
    order:{
      type: Number,
       required: true,
    }
  },]

},{ timestamps: true }
);
const sourceSchema = new mongoose.Schema({
  sourceType: { type: String, enum: ['BOARD', 'AI', "INSTITUTION"], required: true },
  source:{ type: String, required: true }, //can be "Dhaka Board", "AI", "XYZ Institution", etc
  year: { type: Number, required: true, min: 2000, max: 2099 },
  examType: { type: String }, // e.g., "Midterm", "Final", etc. Optional for BOARD and AI
  level: { type: String, enum: LEVELS, required: true }, 
  group: { type: String, enum: GROUPS , required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  mainChapter:{
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  },
});

const creativeQuestionSchema = new mongoose.Schema({
   

  stem: stemSchema, // Array of stems for the question
  source: sourceSchema, // Source information
  c:partSchema,
  d:partSchema,
  a:partSchema,
  b:partSchema,

}, { timestamps: true });



// Optional: Add indexes for better query performance on frequently searched fields like topic IDs
 creativeQuestionSchema.index({ 'cTopic.topicId': 1 });


creativeQuestionSchema.index({'source.sourceType':1, 'source.source':1, 'source.year':1, 'source.level':1, 'source.group':1, 'source.subject':1});

const CreativeQuestion = mongoose.model('CreativeQuestion', creativeQuestionSchema);
export default CreativeQuestion;
