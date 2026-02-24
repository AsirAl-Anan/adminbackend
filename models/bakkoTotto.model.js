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
    subTypes: [classSchema],
    rules: [{
        rule: { type: String, required: true },
        description: { type: String, trim: true },
        examples: [bakkoTottoSentenceSchema],
    }],
    sentenceExamples: [bakkoTottoSentenceSchema],
    articles: [String],
    _id: false
});

const bakkoTottoSentenceSchema = new mongoose.Schema({
    sentence: { type: String, required: true },
    class: [classSchema],
    shomprosharonRules: [{ type: String }],
    shomprosharon: { type: String },
    uddesho: {
        part: { type: String },
        uddeshoType: { type: String },
        uddeshoRules: [{ type: String }],
        explanation: { type: String },
    },
    bideho: {
        part: { type: String },
        bidehoType: { type: String },
        bidehoRules: [{ type: String }],
        explanation: { type: String },
    },
    explanation: { type: String },
    _id: false,
});

const bakkoTottoConversionSchema = new mongoose.Schema({
    sentence: bakkoTottoSentenceSchema,
    classToIdentify: classSchema,
    source: sourceSchema,
    explanation: { type: String, trim: true },
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
    bakkoTottoConversions: [bakkoTottoConversionSchema],
    _id: false,
});

const bakkoTottosSchema = new mongoose.Schema({
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
    bakkoTottoConversions: [bakkoTottoConversionSchema],
    excersizes: [excersizeSchema],
});

const BakkoTotto = academicDb.model("BakkoTotto", bakkoTottoSchema);

export default BakkoTotto;