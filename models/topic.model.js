import mongoose from "mongoose";
// Import the SubjectEmbedding model to interact with it in the middleware
import SubjectEmbedding from "./subject.embedding.model.js"; // <-- ADD THIS IMPORT (verify path is correct)

const topicSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    chapterName: {
      bangla: { type: String },
      english: { type: String },
      chapterId: { type: mongoose.Schema.Types.ObjectId },
    },
    englishName: { type: String, required: true },
    banglaName: { type: String, required: true },
    type: { type: String, enum: ["theory", "practical"], default: "theory" },
    questionTypes: [
      {
        english: { type: String },
        bangla: { type: String },
      },
    ],
    aliases: {
      english: [{ type: String, required: true }],
      bangla: [{ type: String, required: true }],
      banglish: [{ type: String, required: true }],
    },
    segments: [
      {
        uniqueKey: { type: String, required: true },
        title: {
          english: { type: String, required: true },
          bangla: { type: String, required: true },
        },
        description: {
          english: { type: String, required: true },
          bangla: { type: String, required: true },
        },
        images: [
          {
            url: { type: String },
            title: {
              english: { type: String },
              bangla: { type: String },
            },
            description: {
              english: { type: String },
              bangla: { type: String },
            },
          },
        ],
        formulas: [
          {
            equation: { type: String },
            derivation: {
              english: { type: String },
              bangla: { type: String },
            },
            explanation: {
              english: { type: String },
              bangla: { type: String },
            },
          },
        ],
        aliases: {
          english: [{ type: String, required: true }],
          bangla: [{ type: String, required: true }],
          banglish: [{ type: String, required: true }],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ===================================================================
// --- MIDDLEWARE FOR CASCADING DELETES (NEW CODE) ---
// This code will automatically run BEFORE a topic document is deleted,
// ensuring its associated embeddings are also removed.
// ===================================================================

// HOOK 1: For single document deletions (e.g., Topic.findByIdAndDelete)
// The 'pre' hook runs before the 'findOneAndDelete' command is executed.
topicSchema.pre('findOneAndDelete', { document: false, query: true }, async function(next) {
  try {
    // `this.getFilter()` gets the query conditions (e.g., { _id: '...' })
    // We find the document that is about to be deleted to get its ID.
    const topicToDelete = await this.model.findOne(this.getFilter());
    if (topicToDelete) {
      console.log(`Hook triggered: Deleting embeddings for topicId: ${topicToDelete._id}`);
      // Use the ID to delete all matching documents in the SubjectEmbedding collection.
      await SubjectEmbedding.deleteMany({ topicId: topicToDelete._id });
    }
    next(); // Proceed with the original delete operation.
  } catch (error) {
    next(error); // Pass any errors to the next middleware.
  }
});

// HOOK 2: For multiple document deletions (e.g., Topic.deleteMany)
// This is crucial for when you delete a whole chapter or subject.
topicSchema.pre('deleteMany', { document: false, query: true }, async function(next) {
  try {
    // Find all topic documents that match the delete query.
    const topicsToDelete = await this.model.find(this.getFilter()).select('_id');
    if (topicsToDelete.length > 0) {
      const topicIds = topicsToDelete.map(topic => topic._id);
      console.log(`Hook triggered: Deleting embeddings for topicIds: ${topicIds.join(', ')}`);
      // Delete all embeddings where the topicId is in our list of IDs.
      await SubjectEmbedding.deleteMany({ topicId: { $in: topicIds } });
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Topic = mongoose.model("Topic", topicSchema);
export default Topic;