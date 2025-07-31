// models/Answer.js

import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreativeQuestion',
    required: true
  },
  a: {
    type: String,
    required: true
  },
  b: {
    type: String,
    required: true
  },
  c: {
    type: String,
    required: true
  },
  d: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Answer = mongoose.model('Answer', answerSchema);

export default Answer;