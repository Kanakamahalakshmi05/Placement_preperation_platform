const QuizAttempt = require('../models/QuizAttempt');
const Analysis = require('../models/Analysis');
const Resume = require('../models/Resume');
const JobTarget = require('../models/JobTarget');
const StudentProgress = require('../models/StudentProgress');
const { generateUniqueQuizQuestions, normalizeQuestionText } = require('../services/quizGeneratorService');
const { analyzeSkillGap } = require('../services/resumeParserService');

// @desc    Generate exactly 10 NEW unique mock quiz questions
// @route   POST /api/quizzes/generate
// @access  Private (Student)
const generateQuiz = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const difficulty = (req.body.difficulty || req.params.difficulty || 'easy').toLowerCase();

    if (!['easy', 'medium', 'difficult'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty level. Must be "easy", "medium", or "difficult".',
      });
    }

    // 1. Retrieve latest Resume and Target Job
    const [resume, jobTarget] = await Promise.all([
      Resume.findOne({ $or: [{ userId: studentId }, { user: studentId }] }),
      JobTarget.findOne({ userId: studentId }),
    ]);

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your resume before attempting mock quizzes.',
      });
    }

    if (!jobTarget) {
      return res.status(400).json({
        success: false,
        message: 'Please configure your target company job description before attempting mock quizzes.',
      });
    }

    // 2. Retrieve latest valid Analysis or compute dynamically from actual texts
    let latestAnalysis = await Analysis.findOne({
      studentId,
      isValid: true,
    }).sort({ createdAt: -1 });

    let analysisData;
    if (latestAnalysis && latestAnalysis.analysis) {
      analysisData = latestAnalysis.analysis;
    } else {
      const computed = analyzeSkillGap({
        resumeText: resume.rawText || '',
        jdText: jobTarget.jobDescription || '',
        resumeSkills: resume.parsedSkills || [],
        jdSkills: jobTarget.extractedSkills || [],
      });
      analysisData = {
        matchedSkills: computed.matchedSkills,
        skillsToImprove: computed.skillsToImprove,
        importantTopics: computed.importantTopics || computed.recommendedTopics,
      };
    }

    // 3. Retrieve history of previous attempts for this student + targetJob + difficulty
    const previousAttempts = await QuizAttempt.find({
      studentId,
      targetJobId: jobTarget._id,
      difficulty,
    }).sort({ createdAt: -1 });

    // Collect all previously asked question strings
    const previousQuestions = [];
    const priorWeakTopics = [];

    previousAttempts.forEach((attempt) => {
      (attempt.questions || []).forEach((q) => {
        if (q.question) previousQuestions.push(q.question);
        if (q.normalizedQuestion) previousQuestions.push(q.normalizedQuestion);
      });
      if (attempt.submitted && Array.isArray(attempt.needsImprovement)) {
        attempt.needsImprovement.forEach((t) => {
          if (!priorWeakTopics.includes(t)) priorWeakTopics.push(t);
        });
      }
    });

    // 4. Generate 10 NEW unique questions with zero repetition
    const questions = generateUniqueQuizQuestions({
      studentId,
      targetJobId: jobTarget._id,
      difficulty,
      resumeSkills: resume.parsedSkills || [],
      jdSkills: jobTarget.extractedSkills || [],
      analysis: analysisData,
      previousQuestions,
      weakTopics: priorWeakTopics,
    });

    const attemptNumber = previousAttempts.length + 1;

    // 5. Store new QuizAttempt document
    const newAttempt = await QuizAttempt.create({
      studentId,
      targetJobId: jobTarget._id,
      difficulty,
      attemptNumber,
      questions,
      submitted: false,
    });

    // 6. Return questions for student to answer (omitting correctAnswer on client payload)
    const clientQuestions = questions.map((q) => ({
      id: q.questionId,
      questionId: q.questionId,
      question: q.question,
      options: q.options,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    res.status(200).json({
      success: true,
      message: `Generated 10 new ${difficulty} questions for attempt #${attemptNumber}.`,
      data: {
        quizId: newAttempt._id,
        difficulty,
        attemptNumber,
        totalQuestions: clientQuestions.length,
        company: jobTarget.company,
        questions: clientQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit mock quiz and evaluate performance
// @route   POST /api/quizzes/submit
// @access  Private (Student)
const submitQuiz = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { quizId, difficulty, userAnswers = {}, questions: clientQuestions } = req.body;

    let attempt;
    if (quizId) {
      attempt = await QuizAttempt.findOne({ _id: quizId, studentId });
    }

    // Fallback if quizId not passed: find latest unsubmitted attempt
    if (!attempt) {
      attempt = await QuizAttempt.findOne({
        studentId,
        difficulty: (difficulty || 'easy').toLowerCase(),
        submitted: false,
      }).sort({ createdAt: -1 });
    }

    // If still not found, search latest attempt for student
    if (!attempt) {
      attempt = await QuizAttempt.findOne({ studentId }).sort({ createdAt: -1 });
    }

    const questionsToGrade =
      attempt && attempt.questions && attempt.questions.length > 0
        ? attempt.questions
        : clientQuestions || [];

    if (!questionsToGrade || questionsToGrade.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No quiz questions found to evaluate.',
      });
    }

    let correctCount = 0;
    const strongTopicsSet = new Set();
    const weakTopicsSet = new Set();

    questionsToGrade.forEach((q) => {
      const qId = q.questionId || q.id;
      const selected = userAnswers[qId];
      const correct = q.correctAnswer;

      if (selected !== undefined && Number(selected) === Number(correct)) {
        correctCount++;
        if (q.topic) strongTopicsSet.add(q.topic);
      } else {
        if (q.topic) weakTopicsSet.add(q.topic);
      }
    });

    const totalQuestions = questionsToGrade.length;
    const score = correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const incorrectCount = totalQuestions - correctCount;

    const strongAreas = Array.from(strongTopicsSet);
    const needsImprovement = Array.from(weakTopicsSet);

    // If candidate scored 10/10, suggest advanced optimization areas
    if (needsImprovement.length === 0) {
      needsImprovement.push('Advanced Edge Cases & High-Throughput Scenarios');
    }
    if (strongAreas.length === 0) {
      strongAreas.push('Core Fundamentals Engagement');
    }

    // Dynamic AI Performance Diagnosis
    let aiPerformanceAnalysis = '';
    if (percentage >= 80) {
      aiPerformanceAnalysis = `Excellent performance (${score}/${totalQuestions}, ${percentage}%). You demonstrated strong conceptual clarity in ${strongAreas.slice(0, 2).join(' and ')}. Focus on reinforcing ${needsImprovement[0] || 'advanced edge cases'} to guarantee top-tier interview results.`;
    } else if (percentage >= 50) {
      aiPerformanceAnalysis = `Good foundation (${score}/${totalQuestions}, ${percentage}%). You performed well in ${strongAreas.slice(0, 2).join(' and ')}, but experienced difficulty in ${needsImprovement.slice(0, 2).join(' and ')}. Prioritize study in these weak areas before your next attempt.`;
    } else {
      aiPerformanceAnalysis = `Performance needs focused preparation (${score}/${totalQuestions}, ${percentage}%). Review key principles in ${needsImprovement.slice(0, 2).join(' and ')}. We recommend dedicated topic revision before retaking the mock quiz.`;
    }

    const whatToImprove = needsImprovement.map((topic, idx) => {
      return `Master ${topic}: Review core documentation, run sample code, and solve 3 related practice problems.`;
    });

    // Update QuizAttempt record in DB if exists
    if (attempt) {
      attempt.userAnswers = userAnswers;
      attempt.score = score;
      attempt.percentage = percentage;
      attempt.correctAnswers = correctCount;
      attempt.incorrectAnswers = incorrectCount;
      attempt.strongAreas = strongAreas;
      attempt.needsImprovement = needsImprovement;
      attempt.aiPerformanceAnalysis = aiPerformanceAnalysis;
      attempt.whatToImprove = whatToImprove;
      attempt.submitted = true;
      attempt.submittedAt = new Date();
      await attempt.save();
    }

    // Update StudentProgress quiz history
    await StudentProgress.findOneAndUpdate(
      { userId: studentId },
      {
        $push: {
          quizAttempts: {
            difficulty: (difficulty || attempt?.difficulty || 'easy').toLowerCase(),
            score,
            totalQuestions,
            percentage,
            strongAreas,
            needsImprovement,
            aiPerformanceAnalysis,
            whatToImprove,
            submittedAt: new Date(),
          },
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Quiz evaluated successfully.',
      data: {
        score,
        totalQuestions,
        percentage,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        strongAreas,
        needsImprovement,
        aiPerformanceAnalysis,
        whatToImprove,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz history for student
// @route   GET /api/quizzes/history
// @access  Private (Student)
const getQuizHistory = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const history = await QuizAttempt.find({
      studentId,
      submitted: true,
    })
      .sort({ createdAt: -1 })
      .select('difficulty attemptNumber score percentage correctAnswers incorrectAnswers strongAreas needsImprovement submittedAt');

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateQuiz,
  submitQuiz,
  getQuizHistory,
};
