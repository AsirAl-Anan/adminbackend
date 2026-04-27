import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

/**
 * TaxonomyNode — Universal tree node.
 *
 * Replaces: Chapter, Topic, B1, B2, Goddo, Poddo, Uccharon, Banan,
 * ShobdoSreni, ShobdoGothon, Sharangsho, ProbondhoRochona, Dinolipi,
 * PotroLikhon, Onubad, and 30+ other content/category models.
 *
 * Each node belongs to a subject, has a type (matching the subject's
 * taxonomyConfig[].key), and can have children via parentId.
 *
 * The `data` field (Mixed) stores node-type-specific content, validated
 * at the application layer against the subject's taxonomyConfig[].dataSchema.
 *
 * The `ancestors[]` array (materialized path) enables efficient tree
 * queries — get all descendants, build breadcrumbs, etc.
 */
const taxonomyNodeSchema = new mongoose.Schema(
    {
        // --- Tree Position ---
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            index: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TaxonomyNode",
            default: null,
            index: true,
        },
        nodeType: {
            type: String,     // Matches taxonomyConfig[].key  (e.g., "chapter", "topic", "goddo", "category")
            required: true,
            index: true,
        },
        subtype: {
            type: String,     // Optional subtype within a level (e.g., "goddo" vs "poddo" within level "content")
            default: null,
        },
        depth: {
            type: Number,     // Denormalized from taxonomyConfig[].depth for efficient queries
            required: true,
        },
        order: {
            type: Number,     // Display order among siblings
            default: 0,
        },

        // --- Core Identity (common to ALL nodes) ---
        name: {
            en: { type: String },
            bn: { type: String },
        },
        aliases: {
            english: [{ type: String }],
            bangla: [{ type: String }],
            banglish: [{ type: String }],
        },
        importance: {
            type: String,
            enum: ["HIGH", "MEDIUM", "LOW"],
            default: "MEDIUM",
        },
        tags: [{ type: String, trim: true }],

        // --- Dynamic Data (varies per nodeType) ---
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // --- Ancestry Path (materialized for efficient tree queries) ---
        ancestors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "TaxonomyNode",
            },
        ],
    },
    { timestamps: true }
);

// --- Compound Indexes ---
taxonomyNodeSchema.index({ subjectId: 1, nodeType: 1, parentId: 1 }); // Get children of a type under a parent
taxonomyNodeSchema.index({ subjectId: 1, depth: 1, order: 1 });       // Ordered listing at any depth
taxonomyNodeSchema.index({ ancestors: 1 });                             // Find all descendants of a node
taxonomyNodeSchema.index({ subjectId: 1, nodeType: 1, subtype: 1 });  // Filter by subtype

const TaxonomyNode = academicDb.model("TaxonomyNode", taxonomyNodeSchema);

export default TaxonomyNode;
