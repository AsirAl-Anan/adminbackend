import mongoose from "mongoose"

const typeSchema = new mongoose.Schema({
    name: {
        en:{
            type: String,
            required: true,
        },
        bn:{
            type: String,
            required: true,
        }
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
        index: true,
    },
    chapterId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
        index: true,
    },
    topicIds:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: true,
            index: true,
        }
    ],
    description:{
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    questions:{
        id:{
            type:String,
        },
        type:{
            type:String,
            enum:["CQ","MCQ"]
        }
    }


})