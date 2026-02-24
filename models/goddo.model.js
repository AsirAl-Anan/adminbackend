import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const goddoSchema = new mongoose.Schema({
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
    writerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Writer",
        required: true,
        index: true,
    },
    description: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    b1Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "B1",
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
    characters: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Character",
        }
    ],
    wordMeanings: [
        {
            word: { type: String },
            similarWords: [{ type: String }],
            meaning: { type: String },
        }
    ],
    importantSpellings: [
        {
            word: { type: String },
            highlightedPart: { type: String }
        }
    ],
    allExplanations: [
        {
            para: { type: String },
            explanation: { type: String },
            importance: {
                type: String,
                enum: ["HIGH", "MEDIUM", "LOW"],
                default: "MEDIUM",
            },
        }
    ],
    importantExplanations: [
        {
            line: { type: String },
            explanation: { type: String }
        }
    ],
    articles: [{ type: String }],
    relatedCreativeQuestions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CreativeQuestion",
        }
    ],
    relatedMCQs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MCQ",
        }
    ],
    relatedQuestions: [
        {
            question: { type: String },
            answer: { type: String }
        }
    ],
    relatedQuizzes: [
        {
            question: { type: String },
            options: [
                {
                    option: { type: String },
                    isCorrect: { type: Boolean },
                }
            ],
        }
    ]
})

const Goddo = academicDb.model("Goddo", goddoSchema);

export default Goddo;