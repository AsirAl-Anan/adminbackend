import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

/**
 * UnifiedContent — Universal educational content store.
 *
 * Each piece of content belongs to a Subject, is attached to a TaxonomyNode,
 * and follows a specific ContentTemplate (defined by templateKey).
 *
 * The `data` field (Mixed) stores the actual content based on the
 * template's field definitions.
 *
 * The `order` field dictates the sequence of content blocks within a single node.
 */
const unifiedContentSchema = new mongoose.Schema(
    {
        // --- Routing & Structure ---
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            index: true,
        },
        nodeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TaxonomyNode",
            required: true,
            index: true,
        },
        templateKey: {
            type: String,     // Matches ContentTemplate.templateKey
            required: true,
            index: true,
        },
        order: {
            type: Number,     // Display order within the node
            default: 0,
        },

        // --- Common Metadata ---
        status: {
            type: String,
            enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
            default: "DRAFT",
        },
        difficulty: {
            type: String,
            enum: ["EASY", "MEDIUM", "HARD"],
        },
        meta: {
            readingTimeMinutes: { type: Number },
            boards: [{ type: String }], // For multi-board filtering if content differs slightly
            aliases: {
                en: [{ type: String }],
                bn: [{ type: String }],
            },
            tags: {
                en: [{ type: String }],
                bn: [{ type: String }],
            },
        },

        // --- Dynamic Content Data ---
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    { timestamps: true }
);

// --- Compound Indexes ---
// Ordered listing of all content blocks within a specific node
unifiedContentSchema.index({ subjectId: 1, nodeId: 1, order: 1 });
unifiedContentSchema.index({ nodeId: 1, templateKey: 1, status: 1 });

const UnifiedContent = academicDb.model("UnifiedContent", unifiedContentSchema);

export default UnifiedContent;
