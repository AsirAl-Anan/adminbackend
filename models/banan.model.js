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

const bananQuestionSchema = new mongoose.Schema({
    wrongSpelling: { type: String, required: true },
    correctSpelling: { type: String, required: true },
    highlightedPart: { type: String, required: true },
    source: sourceSchema,
    applicableRules: [ruleSchema],
    explanation: { type: String },
    _id: false,
});

const ruleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rule: { type: String, required: true },
    description: { type: String, trim: true },
    examples: [bananQuestionSchema],
    exceptions: [bananQuestionSchema],
    articles: [String],
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
    banans: [bananQuestionSchema],
    _id: false,
});

const bananSchema = new mongoose.Schema({
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
    rules: [ruleSchema],
    questions: [questionSchema],
    banans: [bananQuestionSchema],
    excersizes: [excersizeSchema]
})

const Banan = academicDb.model("Banan", bananSchema);

export default Banan;
