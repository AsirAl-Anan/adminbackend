import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";
import fieldDefinitionSchema from "./schemas/fieldDefinition.schema.js";

/**
 * QuestionTemplate — V2 Section-Based Architecture
 *
 * Each template is a named entity with an ordered list of SECTIONS.
 * Each section contains an ordered list of FIELDS (reusing fieldDefinitionSchema).
 *
 * This eliminates:
 *   - Empty `parts[]` / `partFields[]` for non-CQ types
 *   - Hardcoded `commonFields` toggles
 *   - Flat field lists with no logical grouping
 *
 * CQ "parts" are modeled as a CQ_GROUP field inside a section.
 * Q/A separation is achieved via QUESTION vs ANSWER sections.
 */

const sectionSchema = new mongoose.Schema(
    {
        sectionKey: {
            type: String,
            required: true,
            enum: ["QUESTION", "ANSWER", "META", "CUSTOM"],
        },
        label: {
            en: { type: String },
            bn: { type: String },
        },
        order: { type: Number, default: 0 },
        fields: [fieldDefinitionSchema],
    },
    { _id: false }
);

const questionTemplateSchema = new mongoose.Schema(
    {
        templateKey: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        family: {
            type: [String],
            enum: [
                "CQ",
                "MCQ",
                "QNA",
                "COMPOSITION",
                "GAP_FILLING",
                "TRANSFORMATION",
                "MATCHING",
                "CUSTOM",
            ],
            required: true,
        },
        label: {
            en: { type: String, required: true },
            bn: { type: String, required: true },
        },
        description: {
            en: { type: String },
            bn: { type: String },
        },
        icon: { type: String },

        status: { type: String, enum: ["ACTIVE", "DRAFT", "ARCHIVED"], default: "ACTIVE" },
        tags: [{ type: String }],
        allowedNodeTypes: [{ type: String }],

        // ─── The Core: Ordered Sections ──────────────────────
        sections: [sectionSchema],
    },
    { timestamps: true }
);

const QuestionTemplate = academicDb.model("QuestionTemplate", questionTemplateSchema);

export default QuestionTemplate;
