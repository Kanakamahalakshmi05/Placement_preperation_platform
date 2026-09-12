const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const {
  createSession,
  startSession,
  getStatus,
  getNextQuestion,
  submitAnswer,
  endSession,
  getHistory,
  getEvaluation,
} = require('../controllers/interviewController');

// All interview routes require student authentication
router.use(authenticate);

// Create a new unlimited interview session
router.post('/session', createSession);

// Start an interview (starts 20-minute server timer and generates opening question)
router.post('/:id/start', startSession);

// Query interview state and server-synchronized remaining time
router.get('/:id/status', getStatus);

// Generate and retrieve next adaptive question
router.post('/:id/next-question', getNextQuestion);

// Submit student response for a question
router.post('/:id/answer', submitAnswer);

// End interview & trigger AI evaluation
router.post('/:id/end', endSession);

// Get student's mock interview history (newest first)
router.get('/history', getHistory);

// Get specific interview evaluation
router.get('/:id/evaluation', getEvaluation);

module.exports = router;
