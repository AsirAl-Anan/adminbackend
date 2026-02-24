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

const classSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, trim: true },
    rules: [{ type: String }],
    subTypes: [classSchema],
    wordExamples: [shomashQuestionSchema],
    articles: [String],
    _id: false,
});

const shomashQuestionSchema = new mongoose.Schema({
    beshbakko: {
        purbopod: { type: String },
        proropod: { type: String },
        moddhopod: { type: String },
        full: { type: String, required: true },
    },
    shomash: { type: String, required: true },
    class: classSchema,
    source: sourceSchema,
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
    shomashQuestions: [shomashQuestionSchema],
    _id: false,
});

const shomashSchema = new mongoose.Schema({
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
    classes: [classSchema],
    questions: [questionSchema],
    shomashQuestions: [shomashQuestionSchema],
    excersizes: [excersizeSchema],
});

const Shomash = academicDb.model("Shomash", shomashSchema);

export default Shomash;
