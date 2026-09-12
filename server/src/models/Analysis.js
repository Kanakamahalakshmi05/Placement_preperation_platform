const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
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
      required: true,
    },
    targetJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobTarget',
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Analysis', analysisSchema);
