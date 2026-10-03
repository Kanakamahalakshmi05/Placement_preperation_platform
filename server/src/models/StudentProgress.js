const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    aiAnalysisCompleted: {
      type: Boolean,
      default: false,
    },
    aiAnalysisData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isPreparing: {
      type: Boolean,
      default: false,
    },
    isReadyForRound1: {
      type: Boolean,
      default: false,
    },
    round1Status: {
      type: String,
      enum: ['LOCKED', 'READY', 'IN_PROGRESS', 'PASSED', 'FAILED'],
      default: 'LOCKED',
    },
    round1Score: {
      type: Number,
      default: 0,
    },
    techInterviewStatus: {
      type: String,
      enum: ['LOCKED', 'READY', 'IN_PROGRESS', 'PASSED', 'FAILED'],
      default: 'LOCKED',
    },
    hrInterviewStatus: {
      type: String,
      enum: ['LOCKED', 'READY', 'IN_PROGRESS', 'PASSED', 'FAILED'],
      default: 'LOCKED',
    },
    quizAttempts: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
