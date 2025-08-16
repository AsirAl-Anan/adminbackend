import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  englishName: { type: String, required: true },
  banglaName: { type: String, required: true },
  subjectCode: { type: Number, required: true },
  aliases: {
    english: [{ type: String }],
    bangla: [{ type: String }],
    banglish: [{ type: String }],
  },
  level: {
    type: String,
    enum: ["SSC", "HSC"],
    required: true,
  },
  group: {
    type: String,
    enum: ["science", "arts", "commerce"],
    required: true,
  },
  chapters: {
    type: [
      {
        englishName: { type: String, trim: true, required: true },
        banglaName: { type: String, required: true },
        index: { type: Number, required: true },
        topics: [
          {
            englishName: { type: String, required: true },
            banglaName: { type: String, required: true },
            topicCode: { type: String, },
            englishDescription: { type: String,  },
            banglaDescription: { type: String,  },
            images: [
              {
                url: { type: String, },
                title: { type: String,  },
              },
            ],
            formulas: [
              {
                equation: { type: String,  },
                derivation: { type: String },
                explanation: { type: String },
              },
            ],
            aliases: {
              english: [{ type: String }],
              bangla: [{ type: String }],
              banglish: [{ type: String }],
            },
            index: { type: Number,  },
          },
        ],
      },
    ],
    required: true,
  },
});

const Subject = mongoose.model("Subject", subjectSchema);

export default Subject;
