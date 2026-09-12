const Resume = require('../models/Resume');
const {
  extractTextFromBuffer,
  extractSkills,
  extractProjects,
} = require('../services/resumeParserService');

// @desc    Upload and parse student resume
// @route   POST /api/resume/upload
// @access  Private (Authenticated users)
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a resume file to upload (PDF, DOCX, or TXT).',
      });
    }

    const { originalname, size, mimetype, buffer } = req.file;

    // Extract text from uploaded document buffer
    let rawText = '';
    try {
      rawText = await extractTextFromBuffer(buffer, mimetype, originalname);
    } catch (parseErr) {
      return res.status(422).json({
        success: false,
        message: `Failed to extract text from document: ${parseErr.message}. Ensure the file is not corrupted or password-protected.`,
      });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract sufficient text from the resume. Please ensure it contains selectable text, not scanned images.',
      });
    }

    // Extract skills and projects
    const parsedSkills = extractSkills(rawText);
    const parsedProjects = extractProjects(rawText);

    // Upsert resume record for the authenticated user
    const resume = await Resume.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
        rawText: rawText.trim(),
        parsedSkills,
        parsedProjects,
        uploadedAt: new Date(),
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Invalidate any previous AI analysis for this student since resume changed
    const Analysis = require('../models/Analysis');
    const StudentProgress = require('../models/StudentProgress');
    await Analysis.updateMany({ studentId: req.user._id, isValid: true }, { isValid: false });
    await StudentProgress.findOneAndUpdate(
      { userId: req.user._id },
      { aiAnalysisCompleted: false, aiAnalysisData: null }
    );

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and parsed successfully.',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        parsedSkills: resume.parsedSkills,
        parsedProjects: resume.parsedProjects,
        textSnippet: resume.rawText.substring(0, 400) + '...',
        uploadedAt: resume.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged-in user's resume
// @route   GET /api/resume/me
// @access  Private (Authenticated users)
const getMyResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'No resume found for this user. Please upload one.',
      });
    }

    res.status(200).json({
      success: true,
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        parsedSkills: resume.parsedSkills,
        parsedProjects: resume.parsedProjects,
        rawText: resume.rawText,
        uploadedAt: resume.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete currently logged-in user's resume
// @route   DELETE /api/resume/me
// @access  Private (Authenticated users)
const deleteMyResume = async (req, res, next) => {
  try {
    await Resume.findOneAndDelete({ userId: req.user._id });
    const Analysis = require('../models/Analysis');
    const StudentProgress = require('../models/StudentProgress');
    await Analysis.updateMany({ studentId: req.user._id, isValid: true }, { isValid: false });
    await StudentProgress.findOneAndDelete({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getMyResume,
  deleteMyResume,
};
