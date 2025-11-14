import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const formulaSchema = new mongoose.Schema({
  // --- Core Formula Content ---
  name: {
    en: { type: String, trim: true },
    bn: { type: String, trim: true },
  },
  equation: {
    type: String,
    required: true,
    trim: true, // Stores the LaTeX string
  },
  description: {
    en: { type: String, trim: true },
    bn: { type: String, trim: true },
  },
  derivation: { // The step-by-step derivation, can support Markdown/HTML
    en: { type: String },
    bn: { type: String },
  },
  variables: [{ // Defining each variable used in the equation
    symbol: { type: String, required: true },
    definition: { en: String, bn: String },
    unit: { en: String, bn: String }, // e.g., "meters/second"
    _id: false // No need for individual _id on variables
  }],

  // --- Denormalized Context & Relationships ---
  // These fields are duplicated here for high-performance querying.
  // This allows you to find all formulas for a subject without touching the Topic collection.
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
    index: true,
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chapter",
    required: true,
    index: true,
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    required: true,
    index: true,
  },
  // The ID of the specific section within the topic where this formula is most relevant.
  // This is optional, as a formula might be general to the whole topic.
  sectionId: {
    type: String,
    index: true,
    required: true
  },

  // --- Metadata for Filtering & Organization ---
  importance: {
    type: String,
    enum: ["HIGH", "MEDIUM", "LOW"],
    default: "MEDIUM",
  },
  tags: [{ type: String, trim: true }], // e.g., "kinematics", "calculus", "newtons-laws"
  level:{
    type: String,
    enum: ["SSC", "HSC"],
    required: true,
  },
  group:{
    type: String,
    enum: ["SCIENCE", "HUMANITIES", "COMMERCE"],
    required: true,
  },
  
  
}, { timestamps: true });


// Create a compound index for common queries
formulaSchema.index({ subjectId: 1, chapterId: 1, topicId: 1 });

const Formula = academicDb.model("Formula", formulaSchema);

export default Formula;
