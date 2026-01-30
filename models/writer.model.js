import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const sourceSchema = new mongoose.Schema({
    source: {
        sourceType: { type: String, enum: SOURCE_TYPES, required: true },
        value: {
            type: String,
            required: true
        }
    },
    years: [{ type: Number, required: true, min: 2010, max: new Date().getFullYear() + 5 }],
    examType: {
        type: String,
        enum: ['TEST', 'PRETEST', 'HALFYEARLY', 'FINAL', ''],
        trim: true,
        required: function () {
            return this.source.sourceType === 'INSTITUTION';
        }
    },
}, { _id: false });

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
    qualification: [
        {
            education: { type: String },
            institution: { type: String },
            year: { type: String },
            description: { type: String },
        },
    ],
    awards: [
        {
            name: { type: String },
            type: { type: String },
            year: { type: String },
            description: { type: String },
        },
    ],
    description: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    mentionables: [
        {
            name: { type: String },
            type: { type: String },
            year: { type: String },
            description: { type: String },
        },
    ],
    goddos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Goddo",
            }
        ],
        default: [],
    },
    poddos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Poddo",
            }
        ],
        default: [],
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
    relatedMCQs: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MCQ",
            }
        ],
        default: [],
    },
    questions: [
        {
            question: { type: String },
            options: [{
                option: { type: String },
                isCorrect: { type: Boolean, default: false },
            }],
            answer: { type: String },
            source: sourceSchema,
        },
    ],
});

export default Writer;