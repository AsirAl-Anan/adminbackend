import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";
import fieldDefinitionSchema from "./schemas/fieldDefinition.schema.js";

/**
 * ContentTemplate — Section-Based Architecture
 *
 * Mirrors the QuestionTemplate pattern:
 * Each template has an ordered list of SECTIONS.
 * Each section contains an ordered list of FIELDS.
 *
 * Section types for content:
 *   "CONTENT" — The main rich educational content block
 *   "META"    — Supplementary info (difficulty, tags, reading time)
 *   "CUSTOM"  — Any other grouping
 */

const sectionSchema = new mongoose.Schema(
    {
        sectionKey: {
            type: String,
            required: true,
            enum: ["CONTENT", "META", "CUSTOM"],
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

const contentTemplateSchema = new mongoose.Schema(
    {
        templateKey: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        category: {
            type: String,
            enum: [
                "THEORY",
                "EXAMPLE",
                "DEFINITION",
                "DIAGRAM",
                "NOTE",
                "MULTIMEDIA",
                "INTERACTIVE",
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
        allowedNodeTypes: [{ type: String }], // e.g., ["topic", "chapter"]

        // ─── The Core: Ordered Sections (each containing ordered fields) ─────
        sections: [sectionSchema],
    },
    { timestamps: true }
);

const ContentTemplate = academicDb.model("ContentTemplate", contentTemplateSchema);

export default ContentTemplate;
