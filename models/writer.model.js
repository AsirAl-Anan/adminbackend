import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const writerSchema = new mongoose.Schema({
    name: {
        en: { type: String, required: true },
        bn: { type: String, required: true },
    },
    birth: {
        date: { type: String },
        place: { type: String },
        extras: { type: String },
    },
    death: {
        date: { type: String },
        place: { type: String },
        extras: { type: String },
    },
    qualification: [{
        education: { type: String },
        institution: { type: String },
        year: { type: String },
        description: { type: String },
    }],
    awards: [{
        name: { type: String },
        type: { type: String },
        year: { type: String },
        description: { type: String },
    }],
    description: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    mentionables: [{
        name: { type: String },
        type: { type: String },
        year: { type: String },
        description: { type: String },
    }],
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
}, { timestamps: true });

const Writer = academicDb.model("Writer", writerSchema);
export default Writer;