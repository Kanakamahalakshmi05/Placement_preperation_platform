const mongoose = require('mongoose');

const jobTargetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    jdFileName: {
      type: String,
      trim: true,
      default: 'Job_Description.pdf',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'text/plain',
    },
    jobDescription: {
      type: String,
      required: [true, 'Job Description is required'],
      trim: true,
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    jobTitle: {
      type: String,
      trim: true,
      default: 'Software Engineer',
    },
    driveDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating remaining days until drive date (defaults to 14 days if not set)
jobTargetSchema.virtual('daysRemaining').get(function () {
  if (!this.driveDate) return 14;
  const now = new Date();
  const diffTime = new Date(this.driveDate).getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Configure toJSON to include virtuals
jobTargetSchema.set('toJSON', { virtuals: true });
jobTargetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('JobTarget', jobTargetSchema);
