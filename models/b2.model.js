import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const BATCHES = ["25", "26", "27"];

const b2Schema = new mongoose.Schema({
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
    }
})

const B2 = academicDb.model("B2", b2Schema);

export default B2;
