const Resume = require('../models/Resume');
const JobTarget = require('../models/JobTarget');
const StudentProgress = require('../models/StudentProgress');
const { getAIClient } = require('../config/aiConfig');
const {
  analyzeSkillGap,
} = require('../services/resumeParserService');
const {
  generateQuizQuestions,
  evaluateQuizSubmission,
} = require('../services/quizService');

// @desc    Get student dashboard summary & state-based progress overview
// @route   GET /api/student/dashboard
// @access  Private (Student, Admin)
const getStudentDashboard = async (req, res, next) => {
  try {
    const [resume, jobTarget, progress] = await Promise.all([
      Resume.findOne({
        $or: [{ userId: req.user._id }, { user: req.user._id }],
      }),
      JobTarget.findOne({ userId: req.user._id }),
      StudentProgress.findOne({ userId: req.user._id }),
    ]);

    const hasResume = !!resume;
    const hasTargetJob = !!jobTarget;

    // Retrieve latest valid Analysis document
    const Analysis = require('../models/Analysis');
    const latestValidAnalysis = await Analysis.findOne({
      studentId: req.user._id,
      isValid: true,
    }).sort({ createdAt: -1 });

    let activeAiAnalysis = null;
    let aiAnalysisCompleted = false;

    if (latestValidAnalysis && latestValidAnalysis.analysis) {
      activeAiAnalysis = {
        matchedSkills: latestValidAnalysis.analysis.matchedSkills || [],
        skillsToImprove: latestValidAnalysis.analysis.skillsToImprove || [],
        importantTopics: latestValidAnalysis.analysis.importantTopics || [],
        strongSkills: latestValidAnalysis.analysis.matchedSkills || [],
        missingSkills: latestValidAnalysis.analysis.skillsToImprove || [],
        recommendedTopics: latestValidAnalysis.analysis.importantTopics || [],
        analyzedAt: latestValidAnalysis.createdAt,
      };
      aiAnalysisCompleted = true;
    } else if (hasResume && hasTargetJob && progress?.aiAnalysisCompleted && progress?.aiAnalysisData) {
      activeAiAnalysis = progress.aiAnalysisData;
      aiAnalysisCompleted = true;
    }

    const isPreparing = !!progress?.isPreparing;
    const isReadyForRound1 = !!progress?.isReadyForRound1;

    // Determine exact state (1 through 6)
    let stage = 1;
    let resumeStatus = hasResume ? 'Uploaded' : 'Not added';
    let targetJobStatus = hasTargetJob ? 'Added' : 'Not added';

    let canAccessTargetJob = false;
    let canAccessAnalysis = false;
    let canAccessPreparation = false;
    let canAccessAssessment = false;

    let nextStep = {
      stage: 1,
      title: 'YOUR NEXT STEP',
      message: 'Upload your resume',
      description: 'Upload your resume to extract skills and begin placement preparation.',
      actionText: 'Upload Resume',
      actionTab: 'resume',
    };

    if (!hasResume) {
      // State 1: No resume
      stage = 1;
      resumeStatus = 'Not added';
      targetJobStatus = 'Not added';
      canAccessTargetJob = false;
      canAccessAnalysis = false;
      canAccessPreparation = false;
      canAccessAssessment = false;
      nextStep = {
        stage: 1,
        title: 'YOUR NEXT STEP',
        message: 'Upload your resume',
        description: 'Upload your resume to extract skills and begin placement preparation.',
        actionText: 'Upload Resume',
        actionTab: 'resume',
      };
    } else if (!hasTargetJob) {
      // State 2: Resume uploaded, Target Job missing
      stage = 2;
      resumeStatus = 'Uploaded';
      targetJobStatus = 'Not added';
      canAccessTargetJob = true;
      canAccessAnalysis = false;
      canAccessPreparation = false;
      canAccessAssessment = false;
      nextStep = {
        stage: 2,
        title: 'YOUR NEXT STEP',
        message: 'Add your target job',
        description: 'Enter your target company name and upload the company job description.',
        actionText: 'Add Target Job',
        actionTab: 'target-job',
      };
    } else if (!aiAnalysisCompleted) {
      // State 3: Resume + Target Job available, AI analysis not completed
      stage = 3;
      resumeStatus = 'Uploaded';
      targetJobStatus = 'Added';
      canAccessTargetJob = true;
      canAccessAnalysis = true;
      canAccessPreparation = false;
      canAccessAssessment = false;
      nextStep = {
        stage: 3,
        title: 'YOUR NEXT STEP',
        message: 'Analyze your profile',
        description:
          'Your resume and target job are ready. Analyze your profile to identify your skill gaps.',
        actionText: 'Start AI Analysis',
        actionTab: 'preparation',
      };
    } else if (!isPreparing && !isReadyForRound1) {
      // State 4: AI analysis completed
      stage = 4;
      resumeStatus = 'Uploaded';
      targetJobStatus = 'Added';
      canAccessTargetJob = true;
      canAccessAnalysis = true;
      canAccessPreparation = true;
      canAccessAssessment = false;
      nextStep = {
        stage: 4,
        title: 'YOUR NEXT STEP',
        message: 'Review your skill-gap recommendations',
        description:
          'Review your skill-gap recommendations and see what you should prepare.',
        actionText: 'View Recommendations',
        actionTab: 'preparation',
      };
    } else if (isPreparing && !isReadyForRound1) {
      // State 5: Student is preparing
      stage = 5;
      resumeStatus = 'Uploaded';
      targetJobStatus = 'Added';
      canAccessTargetJob = true;
      canAccessAnalysis = true;
      canAccessPreparation = true;
      canAccessAssessment = false;
      nextStep = {
        stage: 5,
        title: 'YOUR NEXT STEP',
        message: 'Review what you should prepare',
        description: 'Review what you should prepare before indicating interview readiness.',
        actionText: 'Continue Prep',
        actionTab: 'preparation',
      };
    } else if (isReadyForRound1) {
      // State 6: Student has indicated readiness
      stage = 6;
      resumeStatus = 'Uploaded';
      targetJobStatus = 'Added';
      canAccessTargetJob = true;
      canAccessAnalysis = true;
      canAccessPreparation = true;
      canAccessAssessment = true;
      nextStep = {
        stage: 6,
        title: 'YOUR NEXT STEP',
        message: 'Round 1 Technical Assessment',
        description: 'You have confirmed readiness. Complete your timed 20-minute Technical Assessment.',
        actionText: 'Start Round 1',
        actionTab: 'assessment',
      };
    }

    const daysRemaining = jobTarget ? jobTarget.daysRemaining : 10;
    const targetRole = jobTarget ? jobTarget.jobTitle : 'Full Stack AI Engineer';

    res.status(200).json({
      success: true,
      data: {
        stage,
        welcomeMessage: 'Welcome back!',
        candidateName: req.user.name,
        targetRole,
        company: jobTarget?.company || null,
        daysRemaining,
        hasResume,
        resumeStatus,
        hasTargetJob,
        targetJobStatus,
        canAccessTargetJob,
        canAccessAnalysis,
        canAccessPreparation,
        canAccessAssessment,
        aiAnalysisCompleted,
        isPreparing,
        isReadyForRound1,
        aiAnalysisData: activeAiAnalysis,
        jobTargetDetails: jobTarget
          ? {
              id: jobTarget._id,
              company: jobTarget.company,
              jdFileName: jobTarget.jdFileName || 'Company_Job_Description.pdf',
              fileSize: jobTarget.fileSize,
              jobTitle: jobTarget.jobTitle,
              skillsCount: jobTarget.extractedSkills?.length || 0,
              extractedSkills: jobTarget.extractedSkills || [],
            }
          : null,
        resumeDetails: resume
          ? {
              id: resume._id,
              fileName: resume.fileName,
              skillsCount: resume.parsedSkills?.length || resume.skills?.length || 0,
              skills: resume.parsedSkills || resume.skills || [],
              uploadedAt: resume.uploadedAt || resume.createdAt,
            }
          : null,
        nextStep,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger AI Analysis (Compares Resume vs JD) -> Moves to State 4
// @route   POST /api/student/trigger-analysis
// @access  Private (Student)
const triggerAIAnalysis = async (req, res, next) => {
  try {
    const [resume, jobTarget] = await Promise.all([
      Resume.findOne({
        $or: [{ userId: req.user._id }, { user: req.user._id }],
      }),
      JobTarget.findOne({ userId: req.user._id }),
    ]);

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: 'Resume must be uploaded first before starting AI analysis.',
      });
    }

    if (!jobTarget) {
      return res.status(400).json({
        success: false,
        message: 'Target job must be added first before starting AI analysis.',
      });
    }

    // 1. Run local deterministic JD-driven analysis as base or offline guarantee
    const deterministicAnalysis = analyzeSkillGap({
      resumeText: resume.rawText || '',
      jdText: jobTarget.jobDescription || '',
      resumeSkills: resume.parsedSkills || [],
      jdSkills: jobTarget.extractedSkills || [],
    });

    let finalAnalysis = {
      jdRequirements: deterministicAnalysis.jdRequirements || [],
      matchedSkills: deterministicAnalysis.matchedSkills || [],
      matchedSkillsDetailed: deterministicAnalysis.matchedSkillsDetailed || [],
      partialSkills: deterministicAnalysis.partialSkills || [],
      partialSkillsDetailed: deterministicAnalysis.partialSkillsDetailed || [],
      skillsToImprove: deterministicAnalysis.skillsToImprove || [],
      skillsToImproveDetailed: deterministicAnalysis.skillsToImproveDetailed || [],
      importantTopics: deterministicAnalysis.importantTopics || [],
      importantTopicsDetailed: deterministicAnalysis.importantTopicsDetailed || [],
      preparationPriority: deterministicAnalysis.preparationPriority || [],
    };

    // 2. If Gemini AI is configured, invoke Gemini with the complete Resume + Company + JD
    const aiClient = getAIClient();
    if (aiClient) {
      try {
        const prompt = `You are a Senior Technical Hiring Manager and Placement Specialist.
Your task is to analyze a candidate's resume against a company job description (JD).

=== RESUME ===
${(resume.rawText || '').trim()}

=== COMPANY ===
${jobTarget.company || 'Target Company'}

=== JOB DESCRIPTION ===
${(jobTarget.jobDescription || '').trim()}

CRITICAL RULES:
1. EXTRACT REQUIREMENTS FROM JD FIRST:
   - Identify what the company actually requires or prefers (programming languages, frameworks, databases, tools, core CS).
   - Do NOT start with resume technologies.
2. EXTRACT ACTUAL RESUME EVIDENCE:
   - For every JD skill, check if the resume has concrete evidence (projects, experience, action verbs) vs only listed in a keyword list vs completely missing.
3. MATCHED SKILLS:
   - Must ONLY include skills that are required/relevant to the JD AND where the resume shows clear evidence of practical experience or projects.
   - Do NOT include resume skills that are irrelevant to this specific JD (for example, if JD is Frontend React/JS/HTML/CSS, do not include Python or Machine Learning in matched skills just because they are in the resume).
4. SKILLS TO IMPROVE:
   - Must include missing JD skills and weak/partial JD skills that the candidate must prepare.
5. IMPORTANT TOPICS:
   - Rank 5 specific interview preparation topics directly derived from the JD requirements and skill gaps.

Return ONLY a valid JSON object matching this EXACT structure (no markdown, no backticks, no preamble):
{
  "jdRequirements": [
    { "skill": "React", "importance": "high" },
    { "skill": "SQL", "importance": "high" }
  ],
  "matchedSkills": [
    { "skill": "React", "evidence": "Built a React-based application", "strength": "strong" }
  ],
  "partialSkills": [
    { "skill": "SQL", "evidence": "SQL listed in skills with limited project evidence", "strength": "partial" }
  ],
  "skillsToImprove": [
    { "skill": "Docker", "importance": "medium", "reason": "Required by JD but not found in resume" }
  ],
  "importantTopics": [
    { "topic": "SQL Joins and Subqueries", "priority": "HIGH" }
  ],
  "preparationPriority": [
    "SQL Joins and Subqueries — HIGH"
  ]
}`;

        const resp = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const clean = (resp.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (parsed && typeof parsed === 'object') {
          const aiMatched = Array.isArray(parsed.matchedSkills)
            ? parsed.matchedSkills.map((m) => (typeof m === 'object' ? m.skill : m)).filter(Boolean)
            : [];
          const aiImprove = Array.isArray(parsed.skillsToImprove)
            ? parsed.skillsToImprove.map((s) => (typeof s === 'object' ? s.skill : s)).filter(Boolean)
            : [];
          const aiTopics = Array.isArray(parsed.importantTopics)
            ? parsed.importantTopics.map((t) => (typeof t === 'object' ? t.topic : t)).filter(Boolean)
            : [];

          if (aiMatched.length > 0 || aiImprove.length > 0) {
            finalAnalysis = {
              jdRequirements: parsed.jdRequirements || finalAnalysis.jdRequirements,
              matchedSkills: aiMatched,
              matchedSkillsDetailed: parsed.matchedSkills || finalAnalysis.matchedSkillsDetailed,
              partialSkills: Array.isArray(parsed.partialSkills)
                ? parsed.partialSkills.map((p) => (typeof p === 'object' ? p.skill : p))
                : finalAnalysis.partialSkills,
              partialSkillsDetailed: parsed.partialSkills || finalAnalysis.partialSkillsDetailed,
              skillsToImprove: aiImprove,
              skillsToImproveDetailed: parsed.skillsToImprove || finalAnalysis.skillsToImproveDetailed,
              importantTopics: aiTopics.length > 0 ? aiTopics : finalAnalysis.importantTopics,
              importantTopicsDetailed: parsed.importantTopics || finalAnalysis.importantTopicsDetailed,
              preparationPriority: parsed.preparationPriority || finalAnalysis.preparationPriority,
            };
          }
        }
      } catch (geminiErr) {
        console.warn('[AI Analysis] Gemini structured analysis fallback to deterministic engine:', geminiErr.message);
      }
    }

    const Analysis = require('../models/Analysis');

    // Invalidate any previous analysis for this student
    await Analysis.updateMany({ studentId: req.user._id, isValid: true }, { isValid: false });

    // Create and save NEW Analysis document
    const newAnalysis = await Analysis.create({
      studentId: req.user._id,
      resumeId: resume._id,
      targetJobId: jobTarget._id,
      companyName: jobTarget.company || 'Target Company',
      analysis: finalAnalysis,
      isValid: true,
    });

    const strongSkills = finalAnalysis.matchedSkills;
    const missingSkills = finalAnalysis.skillsToImprove;
    const recommendedTopics = finalAnalysis.importantTopics;

    const aiAnalysisData = {
      ...finalAnalysis,
      matchedSkills: strongSkills,
      skillsToImprove: missingSkills,
      importantTopics: recommendedTopics,
      strongSkills,
      missingSkills,
      recommendedTopics,
      analyzedAt: newAnalysis.createdAt,
    };

    const progress = await StudentProgress.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        aiAnalysisCompleted: true,
        aiAnalysisData,
        isPreparing: false,
        isReadyForRound1: false,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'AI skill-gap analysis completed successfully.',
      data: {
        stage: 4,
        analysisId: newAnalysis._id,
        companyName: newAnalysis.companyName,
        matchedSkills: strongSkills,
        skillsToImprove: missingSkills,
        importantTopics: recommendedTopics,
        progress,
        aiAnalysisData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delegate mock quiz generation & submission to quizController
const { generateQuiz, submitQuiz } = require('./quizController');

const getMockQuiz = async (req, res, next) => {
  return generateQuiz(req, res, next);
};

const submitMockQuiz = async (req, res, next) => {
  return submitQuiz(req, res, next);
};

// @desc    Mark student as preparing -> Moves to State 5
// @route   POST /api/student/start-preparing
// @access  Private (Student)
const startPreparing = async (req, res, next) => {
  try {
    const progress = await StudentProgress.findOne({ userId: req.user._id });
    if (!progress || !progress.aiAnalysisCompleted) {
      return res.status(400).json({
        success: false,
        message: 'AI analysis must be completed before entering preparation stage.',
      });
    }

    progress.isPreparing = true;
    progress.isReadyForRound1 = false;
    await progress.save();

    res.status(200).json({
      success: true,
      message: 'Student marked as currently preparing.',
      data: { stage: 5, progress },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Student indicates readiness (I'M READY) -> Moves to State 6
// @route   POST /api/student/ready-for-round1
// @access  Private (Student)
const setReadyForRound1 = async (req, res, next) => {
  try {
    const progress = await StudentProgress.findOne({ userId: req.user._id });
    if (!progress || !progress.aiAnalysisCompleted) {
      return res.status(400).json({
        success: false,
        message: 'AI analysis must be completed before indicating interview readiness.',
      });
    }

    progress.isReadyForRound1 = true;
    progress.round1Status = 'READY';
    await progress.save();

    res.status(200).json({
      success: true,
      message: 'Student indicated readiness. Round 1 Technical Assessment is now unlocked.',
      data: { stage: 6, progress },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset student progress state (Testing / demo reset utility)
// @route   POST /api/student/reset-progress
// @access  Private (Student)
const resetProgress = async (req, res, next) => {
  try {
    await StudentProgress.findOneAndDelete({ userId: req.user._id });
    res.status(200).json({
      success: true,
      message: 'Student progress reset to initial setup state.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  triggerAIAnalysis,
  startPreparing,
  setReadyForRound1,
  resetProgress,
  getMockQuiz,
  submitMockQuiz,
};
