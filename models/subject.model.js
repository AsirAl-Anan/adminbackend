import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";
import fieldDefinitionSchema from "./schemas/fieldDefinition.schema.js";

const GROUPS = ["SCIENCE", "HUMANITIES", "COMMERCE"];
const LEVELS = ["SSC", "HSC"];

// --- Dynamic Architecture Sub-Schemas ---

/**
 * Defines one level in the subject's organizational tree.
 * e.g., Physics has: chapter (depth 0) → topic (depth 1)
 *        Bangla 2 has: section (depth 0) → category (depth 1)
 */
const taxonomyLevelSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: {
      en: { type: String, required: true },
      bn: { type: String, required: true },
    },
    depth: { type: Number, required: true },
    parentLevelKey: { type: String, default: null },
    canHaveQuestions: { type: Boolean, default: false },
    canHaveContent: { type: Boolean, default: false }, // Supports Phase 5 Content features
    subtypes: [
      {
        key: { type: String, required: true },
        label: {
          en: { type: String },
          bn: { type: String },
        },
      },
    ],
    dataSchema: [fieldDefinitionSchema],
  
  },
  { _id: false }
);

// --- Main Subject Schema ---

const subjectSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String },
      bn: { type: String },
    },
    subjectCode: { type: Number, required: true },
    aliases: {
      english: [{ type: String }],
      bangla: [{ type: String }],
      banglish: [{ type: String }],
    },
    level: {
      type: String,
      enum: LEVELS,
      required: true,
    },
    group: {
      type: String,
      enum: GROUPS,
      required: true,
    },

    // Legacy field — kept for backward compatibility during migration
    chapters: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
        },
      ],
      default: [],
    },

    // NEW: Dynamic architecture fields
    taxonomyConfig: {
      type: [taxonomyLevelSchema],
      default: [],
    },
    questionTemplates: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "QuestionTemplate",
        },
      ],
      default: [],
    },
    contentTemplates: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ContentTemplate",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Subject = academicDb.model("Subject", subjectSchema);

export default Subject;
