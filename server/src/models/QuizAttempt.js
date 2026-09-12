const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  normalizedQuestion: {
    type: String,
    required: true,
    index: true,
  },
  options: {
    type: [String],
    required: true,
    validate: [val => val.length === 4, 'Must have exactly 4 options'],
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  explanation: {
    type: String,
    default: '',
  },
  topic: {
    type: String,
    default: '',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'difficult'],
    required: true,
  },
});

const quizAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobTarget',
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'difficult'],
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    questions: [questionSchema],
    submitted: {
      type: Boolean,
      default: false,
      index: true,
    },
    userAnswers: {
      type: Map,
      of: Number,
      default: {},
    },
    score: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    incorrectAnswers: {
      type: Number,
      default: 0,
    },
    strongAreas: {
      type: [String],
      default: [],
    },
    needsImprovement: {
      type: [String],
      default: [],
    },
    aiPerformanceAnalysis: {
      type: String,
      default: '',
    },
    whatToImprove: {
      type: [String],
      default: [],
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
