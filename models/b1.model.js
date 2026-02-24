import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const BATCHES = ["25", "26", "27"];

const b1Schema = new mongoose.Schema({
    name: {
        en: { type: String, trim: true },
        bn: { type: String, trim: true },
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
        index: true,
    },
    batches: {
        type: [String],
        enum: BATCHES,
        default: [],
    },
    goddos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Goddos",
            }
        ],
        default: [],
    },
    poddos: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Poddos",
            }
        ],
        default: [],
    },
})

const B1 = academicDb.model("B1", b1Schema);

export default B1;