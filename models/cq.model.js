// models/CreativeQuestion.js
import mongoose from 'mongoose';
import { academicDb } from '../config/db.config.js';

// It's a good practice to keep constants in a separate file for reusability.
// For this example, they are included here for completeness.
const BOARDS = [
  'Dhaka', 'Rajshahi', 'Chittagong', 'Sylhet', 'Comilla',
  'Jessore', 'Dinajpur', 'Mymensingh', 'Madrasah', 'Barishal'
];
const GROUPS = ['SCIENCE', 'HUMANITIES', 'COMMERCE'];
const LEVELS = ['SSC', 'HSC'];
const SOURCE_TYPES = ['BOARD', 'AI', 'INSTITUTION'];

// --- Reusable Sub-schemas for a DRY (Don't Repeat Yourself) approach ---

/**
 * @description A schema for multilingual text content.
 * Using a custom validator to ensure at least one language is provided.
 * {_id: false} prevents MongoDB from creating a separate _id for this subdocument.
 */
const textSchema = new mongoose.Schema({
  en: { type: String, required:true },
  bn: { type: String, required:true },
}, {
  _id: false,
});

/**
 * @description A reusable schema for image elements.
 */
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { english: String, bangla: String }, // Renamed for consistency with textSchema
  order: { type: Number, default: 0 },
}, { _id: false });

/**
 * @description A generic content block that can contain text and/or images.
 * This pattern is used for stems, questions, and answers to avoid repetition.
 */
const contentBlockSchema = new mongoose.Schema({
  text: textSchema,
  images: [imageSchema],
  order: {
    type: Number,
    required: true,
    default: 1,
  },

}, { _id: false });


// --- Main Schema Definitions ---

/**
 * @description Defines the structure for each part of the creative question (e.g., a, b, c, d).
 */
const partSchema = new mongoose.Schema({
  question: {
    type: [contentBlockSchema],
    required: true,
  },
  answer: [contentBlockSchema],
  marks: { type: Number, required: true },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  topics: [{
    _id: false,
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    weight: {
      type: Number,
      default: 1,
      max: 5,
      min: 1,
    }
  }],
  types: [{
    _id: false,
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', required: true },
    weight: {
      type: Number,
      default: 1,
      max: 5,
      min: 1
    }
  }],
});

/**
 * @description Captures the origin and context of the question.
 */
const sourceSchema = new mongoose.Schema({
  sourceType: { type: String, enum: SOURCE_TYPES, required: true },
  source: { type: String,  trim: true }, // e.g., "Dhaka Board", "AI", "Notre Dame College"
  year: { type: Number, required: true, min: 2010, max: new Date().getFullYear() + 5 },
  examType: { // e.g., "Midterm", "Final". Required only for institutions.
    type: String,
    trim: true,
    required: function() {
      return this.sourceType === 'INSTITUTION';
    }
  },
  board: { // Required only when the sourceType is 'BOARD'.
    type: String,
    enum: BOARDS,
    required: function() {
      return this.sourceType === 'BOARD';
    }
  },
}, { _id: false });

/**
 * @description Contains metadata for categorization and filtering.
 * Includes denormalized fields (name) to improve read performance by avoiding frequent population.
 */
const metaDataSchema = new mongoose.Schema({
  level: { type: String, enum: LEVELS, required: true },
  group: { type: String, enum: GROUPS, required: true },
  subject: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    name: { type: String, required: true } // Denormalized for query performance
  },
  mainChapter: { // The primary chapter this creative question belongs to.
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    name: { type: String, required: true } // Denormalized for query performance
  },
}, { _id: false });

/**
 * @description The main schema for a Creative Question.
 */
const creativeQuestionSchema = new mongoose.Schema({
  stem: {
    type: [contentBlockSchema],
    required: true,
  },
  source: {
    type: sourceSchema,
    required: true,
  },
  meta: {
    type: metaDataSchema,
    required: true
  },
  aliases:{
    en:{
      type:String,
      required:true
    },
    bn:{
      type:String,
      required:true
    },
    banglish:{
      type:String,
      required:true
    }

  },
  tags:{
    en:{
      type:[String],
      required:true
    },
    bn:{
      type:[String],
      required:true
    }
  },
  // Renamed parts for better readability, reflecting the educational structure.
  a: partSchema,      
  b: partSchema, 
  c: partSchema,     
  d: partSchema,   

}, { timestamps: true });

// --- Indexes for Optimal Query Performance ---

// Index for common filtering scenarios: finding questions by subject, level, group, and chapter.
creativeQuestionSchema.index({ 'meta.subject._id': 1, 'meta.level': 1, 'meta.group': 1, 'meta.mainChapter._id': 1 });

// Index for querying by source information.
creativeQuestionSchema.index({ 'source.sourceType': 1, 'source.year': -1, 'source.board': 1 });

// Indexes to efficiently find questions related to a specific topic in the higher-level parts.
creativeQuestionSchema.index({ 'c.topics.topicId': 1 });
creativeQuestionSchema.index({ 'd.topics.topicId': 1 });
creativeQuestionSchema.index({a:'text',b:'text',c:'text',d:'text'});
const CreativeQuestion = academicDb.model('CreativeQuestion', creativeQuestionSchema);
export default CreativeQuestion;

//text search needds to be deployed