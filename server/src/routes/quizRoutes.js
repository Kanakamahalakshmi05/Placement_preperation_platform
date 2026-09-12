const express = require('express');
const router = express.Router();
const {
  generateQuiz,
  submitQuiz,
  getQuizHistory,
} = require('../controllers/quizController');
const authenticate = require('../middleware/authMiddleware');

// All quiz routes require authentication
router.use(authenticate);

// Generate exactly 10 new unique questions (Easy, Medium, Difficult)
router.post('/generate', generateQuiz);
router.get('/generate/:difficulty', generateQuiz);

// Submit quiz answers & receive AI performance analysis
router.post('/submit', submitQuiz);

// Get student quiz attempt history
router.get('/history', getQuizHistory);

module.exports = router;
