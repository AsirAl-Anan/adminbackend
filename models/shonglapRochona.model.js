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

const shonglapRochonaSchema = new mongoose.Schema({
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
    stems: [{
        en: {
            type: String,
            required: true,
        },
        bn: {
            type: String,
            required: true,
        }
    }],
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
    rules: [{ type: String, trim: true }],
    keypoints: [{ type: String, trim: true }],
    keyinfos: [{ type: String, trim: true }],
    dialogues: [{ 
        character: { type: String, trim: true },
        conversation: { type: String, trim: true },
     }],
    source: sourceSchema,
});

const ShonglapRochona = academicDb.model("ShonglapRochona", shonglapRochonaSchema);

export default ShonglapRochona;