import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

/**
 * UnifiedQuestion — Universal question store.
 *
 * Replaces: cq.model.js, mcq.model.js, b2.question.model.js,
 * and all embedded question/exercise arrays in category models.
 *
 * Each question belongs to a subject, is attached to a TaxonomyNode,
 * and follows a template (subject.questionTemplates[].templateKey).
 *
 * The `data` field (Mixed) stores template-specific question content,
 * validated at the application layer against the template's field definitions.
 */
const questionSchema = new mongoose.Schema(
    {
        // --- Routing ---
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            index: true,
        },
        templateKey: {
            type: String,     // Matches subject.questionTemplates[].templateKey
            required: true,
            index: true,
        },

        // --- Common Metadata ---
        status: {
            type: String,
            enum: ["PUBLISHED", "DRAFT", "UNDER_REVIEW"],
            default: "DRAFT",
        },
        source: {
            sourceType: {
                type: String,
                enum: ["BOARD", "OTHER", "INSTITUTION"],
            },
            value: { type: String },
            year: { type: Number },
            examType: { type: String },
        },
        marks: { type: Number },
        difficulty: {
            type: String,
            enum: ["EASY", "MEDIUM", "HARD"],
        },
        meta: {
            level: { type: String },
            group: { type: String },
            aliases: {
                en: [{ type: String }],
                bn: [{ type: String }],
                banglish: [{ type: String }],
            },
            tags: {
                en: [{ type: String }],
                bn: [{ type: String }],
            },
        },

        // --- Dynamic Question Data ---
        // Stored by SectionKey (e.g. data.QUESTION, data.ANSWER, data.META)
        data: {
            QUESTION: { type: mongoose.Schema.Types.Mixed },
            ANSWER: { type: mongoose.Schema.Types.Mixed },
            META: { type: mongoose.Schema.Types.Mixed },
            CUSTOM: { type: mongoose.Schema.Types.Mixed },
        },

        // --- Field-Level Taxonomy Associations (auto-extracted from data) ---
        // Denormalized for fast indexed querying. Populated automatically by
        // the question controller when creating/updating a question.
        // Enables: "find all questions linked to topic X" without scanning data: Mixed
        taxonomyLinks: [
            {
                fieldPath: { type: String, required: true },    // Dot-path to the REFERENCE field in data
                nodeId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "TaxonomyNode",
                    required: true,
                },
                semanticRole: { type: String, default: "reference" }, // Mirrors referenceConfig.semanticRole
            },
        ],
    },
    { timestamps: true }
);

// --- Compound Indexes ---
questionSchema.index({ subjectId: 1, templateKey: 1, status: 1 });
questionSchema.index({ subjectId: 1, "source.year": -1 });
questionSchema.index({ status: 1, createdAt: -1 });

// --- Taxonomy Link Indexes (for field-level relational queries) ---
questionSchema.index({ "taxonomyLinks.nodeId": 1 });                        // Find questions linked to any specific node
questionSchema.index({ "taxonomyLinks.semanticRole": 1, subjectId: 1 });     // Role-scoped queries
questionSchema.index({ subjectId: 1, "taxonomyLinks.nodeId": 1 });           // Subject-scoped topic queries

const UnifiedQuestion = academicDb.model("UnifiedQuestion", questionSchema);

export default UnifiedQuestion;
