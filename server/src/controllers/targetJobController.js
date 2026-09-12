const JobTarget = require('../models/JobTarget');
const Resume = require('../models/Resume');
const StudentProgress = require('../models/StudentProgress');
const {
  extractTextFromBuffer,
  extractSkills,
} = require('../services/resumeParserService');

// @desc    Create or update target job with company name and uploaded JD file
// @route   POST /api/target-job
// @access  Private (Student, Admin)
const saveTargetJob = async (req, res, next) => {
  try {
    // Enforce Rule: Resume must be added first
    const existingResume = await Resume.findOne({
      $or: [{ userId: req.user._id }, { user: req.user._id }],
    });

    if (!existingResume) {
      return res.status(400).json({
        success: false,
        message: 'Resume must be uploaded first before adding a target job.',
      });
    }

    const { company } = req.body;

    if (!company || company.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required (at least 2 characters).',
      });
    }

    let rawText = '';
    let jdFileName = 'Company_Job_Description.pdf';
    let fileSize = 0;
    let mimeType = 'text/plain';

    if (req.file) {
      jdFileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;

      try {
        rawText = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      } catch (parseErr) {
        return res.status(422).json({
          success: false,
          message: `Failed to extract text from JD file: ${parseErr.message}. Ensure the file is not corrupted or password-protected.`,
        });
      }
    } else if (req.body.jobDescription && req.body.jobDescription.trim().length >= 20) {
      rawText = req.body.jobDescription.trim();
      jdFileName = req.body.jdFileName || 'Company_JD.txt';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a company job description file (PDF, DOCX, or TXT).',
      });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract sufficient text from the job description. Please ensure the document contains readable text.',
      });
    }

    // Extract skills from JD text
    const extractedSkills = extractSkills(rawText);

    // Upsert target job for authenticated student
    const targetJob = await JobTarget.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        company: company.trim(),
        jdFileName,
        fileSize,
        mimeType,
        jobDescription: rawText.trim(),
        extractedSkills,
        jobTitle: req.body.jobTitle || 'Software Engineer',
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Invalidate any previous AI analysis for this student since Target Job / JD changed
    const Analysis = require('../models/Analysis');
    const StudentProgress = require('../models/StudentProgress');
    await Analysis.updateMany({ studentId: req.user._id, isValid: true }, { isValid: false });
    await StudentProgress.findOneAndUpdate(
      { userId: req.user._id },
      { aiAnalysisCompleted: false, aiAnalysisData: null }
    );

    res.status(200).json({
      success: true,
      message: 'Target job and company JD saved successfully.',
      data: {
        id: targetJob._id,
        company: targetJob.company,
        jdFileName: targetJob.jdFileName,
        fileSize: targetJob.fileSize,
        extractedSkills: targetJob.extractedSkills,
        createdAt: targetJob.createdAt,
        updatedAt: targetJob.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active target job details for current student
// @route   GET /api/target-job
// @access  Private (Student, Admin)
const getTargetJob = async (req, res, next) => {
  try {
    const targetJob = await JobTarget.findOne({ userId: req.user._id });

    res.status(200).json({
      success: true,
      data: targetJob
        ? {
            id: targetJob._id,
            company: targetJob.company,
            jdFileName: targetJob.jdFileName || 'Company_Job_Description.pdf',
            fileSize: targetJob.fileSize,
            extractedSkills: targetJob.extractedSkills,
            jobDescription: targetJob.jobDescription,
            createdAt: targetJob.createdAt,
            updatedAt: targetJob.updatedAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete target job details
// @route   DELETE /api/target-job
// @access  Private (Student, Admin)
const deleteTargetJob = async (req, res, next) => {
  try {
    await JobTarget.findOneAndDelete({ userId: req.user._id });
    // Reset any AI analysis and progress states
    await StudentProgress.findOneAndUpdate(
      { userId: req.user._id },
      {
        aiAnalysisCompleted: false,
        aiAnalysisData: null,
        isPreparing: false,
        isReadyForRound1: false,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Target job removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveTargetJob,
  getTargetJob,
  deleteTargetJob,
};
