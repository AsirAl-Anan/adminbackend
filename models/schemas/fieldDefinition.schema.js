import mongoose from "mongoose";

/**
 * Reusable field definition schema.
 * Used by: QuestionTemplate.sections[].fields, Subject.taxonomyConfig[].dataSchema
 *
 * Each field definition describes a single dynamic field — its key, label, type,
 * validation rules, and rendering hints for the frontend DynamicFieldRenderer.
 */
const fieldDefinitionSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        label: {
            en: { type: String, required: true },
            bn: { type: String, required: true },
        },
        fieldType: {
            type: String,
            required: true,
            enum: [
                "TEXT",              // Single-line text input
                "RICH_TEXT",         // Multi-line text / LaTeX editor with preview
                "BILINGUAL_TEXT",    // Side-by-side { en, bn } text inputs
                "NUMBER",            // Numeric input with optional min/max
                "SELECT",            // Single-value dropdown from options[]
                "MULTI_SELECT",      // Multi-value tag-style select from options[]
                "IMAGE_ARRAY",       // Array of uploadable images
                "CONTENT_BLOCKS",    // Ordered bilingual text + image blocks
                "REFERENCE",         // Single ObjectId reference
                "REFERENCE_ARRAY",   // Array of ObjectId references
                "KEY_VALUE_ARRAY",   // Dynamic list of { key, value } pairs
                "NESTED_GROUP",      // Fixed group of child fields (rendered once)
                "BOOLEAN",           // Toggle / checkbox
                "MCQ_OPTIONS",       // MCQ-specific: options with identifier + isCorrect
                "REPEATABLE_GROUP",  // Like NESTED_GROUP but user can add/remove instances
                "CQ_GROUP",          // CQ-specific: repeatable parts with shared child schema
            ],
        },
        isRequired: { type: Boolean, default: false },
        order: { type: Number, default: 0 }, // Explicit display order within its parent
        options: [{ type: String }],            // For SELECT / MULTI_SELECT enum values
        // Legacy: kept for backward compat. Prefer referenceConfig below.
        referenceCollection: { type: String },
        // Enhanced reference configuration for REFERENCE / REFERENCE_ARRAY fields
        referenceConfig: {
            collection: { type: String },           // Collection name: "TaxonomyNode", "Writer", etc.
            semanticRole: { type: String },          // What this link means: "topic_link", "author_link"
            filterByNodeType: { type: String },      // Restrict picker to this nodeType (e.g., "topic")
            filterBySubjectId: { type: Boolean, default: false }, // Auto-scope to current subject
        },
        children: [{ type: mongoose.Schema.Types.Mixed }], // For NESTED_GROUP / REPEATABLE_GROUP / CQ_GROUP sub-fields
        defaultValue: { type: mongoose.Schema.Types.Mixed },
        placeholder: {
            en: { type: String },
            bn: { type: String },
        },
        conditionalOn: {
            field: { type: String },                           // Key of the controlling field
            value: { type: mongoose.Schema.Types.Mixed },      // Value that triggers visibility
        },
        validation: {
            min: { type: Number },
            max: { type: Number },
            pattern: { type: String },       // Regex pattern for TEXT fields
            maxLength: { type: Number },
            maxItems: { type: Number },      // Max array items (REPEATABLE_GROUP, CQ_GROUP, arrays)
            minItems: { type: Number },      // Min array items
            maxDepth: { type: Number, default: 4 }, // Max nesting depth for group types
        },
    },
    { _id: false }
);

export default fieldDefinitionSchema;
