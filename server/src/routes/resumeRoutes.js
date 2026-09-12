const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const authenticate = require('../middleware/authMiddleware');
const {
  uploadResume,
  getMyResume,
  deleteMyResume,
} = require('../controllers/resumeController');

// All routes require authentication
router.use(authenticate);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/me', getMyResume);
router.delete('/me', deleteMyResume);

module.exports = router;
