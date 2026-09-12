const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    parsedSkills: {
      type: [String],
      default: [],
    },
    parsedProjects: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        techStack: { type: [String], default: [] },
      },
    ],
    experienceLevel: {
      type: String,
      enum: ['Fresher', 'Entry Level', 'Intermediate', 'Senior', 'Not Specified'],
      default: 'Fresher',
    },
  },
  {
    timestamps: true,
  }
);

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
