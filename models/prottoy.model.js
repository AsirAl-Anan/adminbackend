import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const SOURCE_TYPES = ['BOARD', 'OTHER', 'INSTITUTION'];

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

const prottoyQuestionSchema = new mongoose.Schema({
    letter: { type: String, required: true },
    banglaRupLetter: { type: String, required: true },
    examples: [
        {
            addition: { type: String, required: true },
            result: { type: String, required: true },
            prottoyType: { type: String, enum: ['KRIT', 'TOTDHITO']},
            source: sourceSchema
        }
    ],
    explanation: { type: String },
    _id: false,
});

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    source: sourceSchema,
    _id: false,
});

const excersizeSchema = new mongoose.Schema({
    source: sourceSchema,
    questions: [questionSchema],
    prottoys: [prottoyQuestionSchema],
    _id: false,
});

const prottoySchema = new mongoose.Schema({
    name: {
        en: {
            type: String,
            required: true,
        },
        bn: {
            type: String,
            required: true,
        }
    },
    description: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    b2Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "B2",
        required: true,
        index: true,
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
    rules: [{type: String}],
    questions: [questionSchema],
    prottoys: [prottoyQuestionSchema],
    excersizes: [excersizeSchema]
});

const Prottoy = academicDb.model("Prottoy", prottoySchema);

export default Prottoy;