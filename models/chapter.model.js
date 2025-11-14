import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const chapterSchema  = new mongoose.Schema({
    subjectId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
    },
    chapterNo:{
        type: Number,
        required: true,
    },
    name:{
        en:{
            type: String,
            required: true,
        },
        bn:{
            type: String,
            required: true,
        }
    },
    aliases:{
        english: [{ type: String }],
        bangla: [{ type: String }],
        banglish: [{ type: String }],
      
    },
    topics:{
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Topic",
            }
        ],
        default: [],
    }
},{timestamps:true})


const Chapter = academicDb.model("Chapter", chapterSchema);

export default Chapter;
