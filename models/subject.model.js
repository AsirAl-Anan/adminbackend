import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const GROUPS = ["SCIENCE", "HUMANITIES", "COMMERCE"];
const LEVELS = ["SSC", "HSC"];
const subjectSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
      },
      bn: {
        type: String,
      },
    },
    subjectCode: { type: Number, required: true },
    aliases: {
      english: [{ type: String }],
      bangla: [{ type: String }],
      banglish: [{ type: String }],
    },
    level: {
      type: String,
      enum: LEVELS,
      required: true,
    },
    group: {
      type: String,
      enum: GROUPS,
      required: true,
    },
    chapters: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Subject = academicDb.model("Subject", subjectSchema);

export default Subject;
