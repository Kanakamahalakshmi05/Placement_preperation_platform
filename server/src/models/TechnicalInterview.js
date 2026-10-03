const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      default: 'General Technical',
    },
    questionType: {
      type: String,
      default: 'technical',
    },
    targetProject: {
      type: String,
      default: null,
    },
    targetTechnology: {
      type: String,
      default: null,
    },
    expectedPoints: {
      type: [String],
      default: [],
    },
    candidateUnderstanding: {
      type: String,
      enum: ['strong', 'moderate', 'weak', 'skipped', null],
      default: null,
    },
    probingDepth: {
      type: Number,
      default: 1,
    },
    followUpTo: {
      type: String,
      default: null,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'difficult'],
      default: 'medium',
    },
    reason: {
      type: String,
      default: '',
    },
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    isRepeatedFromPrevious: {
      type: Boolean,
      default: false,
    },
    askedAt: {
      type: Date,
      default: Date.now,
    },
    studentAnswer: {
      type: String,
      default: '',
    },
    answeredAt: {
      type: Date,
    },
  },
  { _id: false }
);

const technicalInterviewSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
    },
    targetJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobTarget',
    },
    companyName: {
      type: String,
      default: 'Target Company',
    },
    interviewType: {
      type: String,
      enum: ['technical', 'hr'],
      default: 'technical',
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'NOT_STARTED',
      index: true,
    },
    duration: {
      type: Number,
      default: 1200, // 20 minutes in seconds
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    resumeProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    interviewContext: {
      coveredSkills: { type: [String], default: [] },
      uncoveredImportantSkills: { type: [String], default: [] },
      coveredProjects: { type: [String], default: [] },
      uncoveredProjects: { type: [String], default: [] },
      coveredQuestionTypes: { type: [String], default: [] },
      currentFocusProject: { type: String, default: null },
      currentFocusTech: { type: String, default: null },
      currentDepth: { type: Number, default: 1 },
      consecutiveStrongAnswers: { type: Number, default: 0 },
      consecutiveWeakAnswers: { type: Number, default: 0 },
    },
    currentPhase: {
      type: String,
      default: 'TECHNICAL_SKILLS',
    },
    questions: [interviewQuestionSchema],
    evaluation: {
      overallScore: { type: Number, default: 0 },
      // Technical criteria
      technicalKnowledge: { type: Number, default: 0 },
      practicalUnderstanding: { type: Number, default: 0 },
      projectUnderstanding: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      depthOfUnderstanding: { type: Number, default: 0 },
      depth: { type: Number, default: 0 }, // backwards compatibility
      answerRelevance: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      // HR criteria
      communicationClarity: { type: Number, default: 0 },
      confidenceComposure: { type: Number, default: 0 },
      teamwork: { type: Number, default: 0 },
      leadership: { type: Number, default: 0 },
      adaptability: { type: Number, default: 0 },
      roleMotivation: { type: Number, default: 0 },
      behavioralReasoning: { type: Number, default: 0 },
      professionalism: { type: Number, default: 0 },
      communicationObservations: { type: String, default: '' },
      recommendedNextAreas: { type: [String], default: [] },
      strengths: [
        {
          skill: { type: String },
          evidence: { type: String },
        },
      ],
      weaknesses: [
        {
          skill: { type: String },
          evidence: { type: String },
        },
      ],
      notAssessed: { type: [String], default: [] },
      recommendations: [
        {
          topic: { type: String },
          reason: { type: String },
        },
      ],
      questionEvaluations: [
        {
          questionId: { type: String },
          question: { type: String },
          answer: { type: String },
          score: { type: Number },
          correctness: { type: String },
          depth: { type: String },
          feedback: { type: String },
        },
      ],
      // Backwards compatibility legacy fields
      strongAreas: { type: [String], default: [] },
      needsImprovement: { type: [String], default: [] },
      whatToImprove: { type: [String], default: [] },
      aiFeedback: { type: String, default: '' },
      evaluatedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a student's interviews ordered by attempt/creation
technicalInterviewSchema.index({ studentId: 1, attemptNumber: -1 });

module.exports = mongoose.model('TechnicalInterview', technicalInterviewSchema);
