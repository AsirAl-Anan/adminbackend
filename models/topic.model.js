import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

// new schema
const questionTypeSchema = new mongoose.Schema({
  name: {
    en: { type: String, },
    bn: { type: String, },
  },
  description: {
    en: { type: String },
    bn: { type: String },
  },
});


const topicSchema = new mongoose.Schema({
  // --- Core Identifiers (Unchanged) ---
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    index: true,
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter",
    index: true,
  },



  // --- Core Information  ---
  name: {
    en: { type: String, trim: true },
    bn: { type: String, trim: true },
  },
  description: {
    en: { type: String, trim: true },
    bn: { type: String, trim: true },
  },
  aliases: {
    english: [{ type: String, trim: true }],
    bangla: [{ type: String, trim: true }],
    banglish: [{ type: String, trim: true }],
  },
  topicNumber: {
    type: String,
    trim: true,
  },

  // --- Metadata (Unchanged) ---
  importance: { // the number in importance represents stars. If a topic has 2 in importance, it is a 2-star topic.
    type: String,
    enum: ["HIGH", "MEDIUM", "LOW"],
    default: "MEDIUM",
  },
  questionTypes: [questionTypeSchema],  // new field
  tags: [{ type: String, trim: true }],

  // --- Enriched Content Block (SIGNIFICANTLY UPDATED) ---
  articles: [
    {
      learningOutcomes: {
        en: [{ type: String, trim: true }],
        bn: [{ type: String, trim: true }],
      },
      body: {
        en: { type: String },
        bn: { type: String },
      },
      //  Master list of all formulas for this topic, now stored as references.
      formulas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Formula", // Points to the separate Formula collection
      }],

      sections: [
        {
          title: {
            en: { type: String, trim: true },
            bn: { type: String, trim: true },
          },
          body: {
            en: { type: String },
            bn: { type: String },
          },
          images: [{
            url: { type: String, },
            caption: { en: String, bn: String },
            description: { en: String, bn: String },
            order: Number,
          }],
          videos: [{
            url: { type: String, },
            platform: { type: String, enum: ["YOUTUBE", "FACEBOOK"] },
            caption: { en: String, bn: String },
            videoId: { type: String },
          }],
          examples: [{
            title: { en: String, bn: String },
            question: { en: String, bn: String },
            answer: { en: String, bn: String },
            type: {
              type: String,
              enum: ["STATEMENT", "MCQ", "CQ", "COMPREHENSIVE"]
            }
          }],

          // holds references to formulas from the master list above.
          formulas: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Formula",
          }],
        }
      ],

      // These fields are unchanged
      relatedCreativeQuestions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CreativeQuestion",
      }],
      relatedMCQs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "MCQ",
      }],
      relatedQuestions: [
        {
          question: { type: String },
          answer: { type: String }
        }
      ]
    },
  ],

  // --- Relationships (Unchanged) ---
  relatedTopics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
  }],

}, { timestamps: true });


const Topic = academicDb.model("Topic", topicSchema);
export default Topic;