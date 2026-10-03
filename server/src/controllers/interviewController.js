const interviewService = require('../services/interviewService');
const TechnicalInterview = require('../models/TechnicalInterview');

/**
 * Creates a brand new interview session for the authenticated student.
 * POST /api/interviews/session
 */
const createSession = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { interviewType = 'technical' } = req.body || {};
    const session = await interviewService.createInterviewSession(studentId, interviewType);

    res.status(201).json({
      success: true,
      message: `${session.interviewType === 'hr' ? 'HR' : 'Technical'} Mock Interview #${session.attemptNumber} session created.`,
      data: {
        id: session._id,
        attemptNumber: session.attemptNumber,
        companyName: session.companyName,
        interviewType: session.interviewType || 'technical',
        duration: session.duration,
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Starts the interview, starting the 20-minute timer and generating the first question.
 * POST /api/interviews/:id/start
 */
const startSession = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    const session = await interviewService.startInterviewSession(id, studentId);
    const remainingSeconds = interviewService.calculateRemainingSeconds(session);
    const currentQuestion =
      session.questions && session.questions.length > 0
        ? session.questions[session.questions.length - 1]
        : null;

    res.status(200).json({
      success: true,
      message: `${session.interviewType === 'hr' ? 'HR' : 'Technical'} Mock Interview started.`,
      data: {
        id: session._id,
        attemptNumber: session.attemptNumber,
        companyName: session.companyName,
        interviewType: session.interviewType || 'technical',
        status: session.status,
        startTime: session.startTime,
        remainingSeconds,
        question: currentQuestion,
        questionIndex: session.questions ? session.questions.length : 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Checks interview status and retrieves current server-synchronized timer.
 * GET /api/interviews/:id/status
 */
const getStatus = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    const session = await TechnicalInterview.findOne({ _id: id, studentId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const remainingSeconds = interviewService.calculateRemainingSeconds(session);

    res.status(200).json({
      success: true,
      data: {
        id: session._id,
        attemptNumber: session.attemptNumber,
        status: session.status,
        companyName: session.companyName,
        interviewType: session.interviewType || 'technical',
        remainingSeconds,
        questionCount: session.questions ? session.questions.length : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates and fetches the next adaptive technical question.
 * POST /api/interviews/:id/next-question
 */
const getNextQuestion = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    const result = await interviewService.generateNextQuestion(id, studentId);

    if (result.isCompleted) {
      return res.status(200).json({
        success: true,
        isCompleted: true,
        message: 'Interview has concluded.',
        data: result.session,
      });
    }

    res.status(200).json({
      success: true,
      isCompleted: false,
      data: {
        question: result.question,
        remainingSeconds: result.remainingSeconds,
        attemptNumber: result.attemptNumber,
        questionIndex: result.questionIndex,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submits the student's answer for a question.
 * POST /api/interviews/:id/answer
 */
const submitAnswer = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const { questionId, studentAnswer } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'questionId is required.' });
    }

    const result = await interviewService.submitInterviewAnswer(id, studentId, {
      questionId,
      studentAnswer,
    });

    res.status(200).json({
      success: true,
      message: 'Answer saved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Concludes the interview early or upon timer expiration, running AI evaluation.
 * POST /api/interviews/:id/end
 */
const endSession = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const { isTimeExpired } = req.body;

    const result = await interviewService.endInterviewSession(id, studentId, isTimeExpired);

    res.status(200).json({
      success: true,
      message: 'Interview completed and evaluated.',
      data: {
        session: result.session,
        evaluation: result.evaluation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns all past mock interviews for the student, sorted newest first.
 * GET /api/interviews/history
 */
const getHistory = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { type } = req.query;
    const history = await interviewService.getInterviewHistory(studentId, type);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the full evaluation for an interview.
 * GET /api/interviews/:id/evaluation
 */
const getEvaluation = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    const evaluationData = await interviewService.getInterviewEvaluation(id, studentId);

    res.status(200).json({
      success: true,
      data: evaluationData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  startSession,
  getStatus,
  getNextQuestion,
  submitAnswer,
  endSession,
  getHistory,
  getEvaluation,
};
