import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";


const mcqSchema = new mongoose.Schema({
    topicId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        required: true,
        index: true,
    },
    question:{
        en: { type: String,  },
        bn: { type: String,  },
    },
    options:[{
        en: { type: String,},
        bn: { type: String,  },
        identifier: { type: String, enum: ["A", "B", "C", "D","E"], required: true },
    }],
    answer:{
        en: { type: String, },
        bn: { type: String, },
    },
    type:{
        type: String,
        enum: ["STATEMENT", "MCQ", "CQ", "COMPREHENSIVE"],
        default: "MCQ",
    }
})

const MCQ = academicDb.model("MCQ", mcqSchema)
export default MCQ