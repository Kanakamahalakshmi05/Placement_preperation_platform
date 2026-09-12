const express = require('express');
const router = express.Router();
const {
  getStudentDashboard,
  triggerAIAnalysis,
  startPreparing,
  setReadyForRound1,
  resetProgress,
  getMockQuiz,
  submitMockQuiz,
} = require('../controllers/studentController');
const authenticate = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Student dashboard overview
router.get('/dashboard', getStudentDashboard);

// State transitions
router.post('/trigger-analysis', triggerAIAnalysis);
router.post('/start-preparing', startPreparing);
router.post('/ready-for-round1', setReadyForRound1);
router.post('/reset-progress', resetProgress);

// Mock Quizzes (Easy, Medium, Difficult)
router.get('/quiz/:difficulty', getMockQuiz);
router.post('/quiz/submit', submitMockQuiz);

module.exports = router;
