import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const fieldDataSchema = new mongoose.Schema({
    fieldKey: { type: String, required: true },
    valueText: { type: String },
    valueNumber: { type: Number },
    valueBoolean: { type: Boolean },
    valueArray: [{ type: String }],
    valueRichText: { type: String },
    valueReference: { type: mongoose.Schema.Types.ObjectId, refPath: "sections.fields.referenceCollection" },
    valueReferenceArray: [{ type: mongoose.Schema.Types.ObjectId, refPath: "sections.fields.referenceCollection" }],
    referenceCollection: { type: String }, // To help populate dynamic refs
    valueJSON: { type: mongoose.Schema.Types.Mixed }, // Catch-all for complex nested structures
}, { _id: false });

const sectionDataSchema = new mongoose.Schema({
    sectionKey: { type: String, required: true, enum: ["CONTENT", "META", "CUSTOM"] },
    fields: [fieldDataSchema],
}, { _id: false });

const educationalContentSchema = new mongoose.Schema({
    template: { type: mongoose.Schema.Types.ObjectId, ref: "ContentTemplate", required: true },
    node: { type: mongoose.Schema.Types.ObjectId, ref: "TaxonomyNode", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    
    // The actual content data, mirroring the template's sections structure
    sections: [sectionDataSchema],
    
    // Denormalized meta for easy querying/display
    status: { type: String, enum: ["ACTIVE", "DRAFT", "ARCHIVED"], default: "DRAFT" },
    title: { type: String, required: true }, // Usually extracted from the first text field
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    
}, { timestamps: true });

// Ensure we can quickly find all content for a specific node and template
educationalContentSchema.index({ node: 1, template: 1 });
educationalContentSchema.index({ subject: 1, status: 1 });

const EducationalContent = academicDb.model("EducationalContent", educationalContentSchema);

export default EducationalContent;
