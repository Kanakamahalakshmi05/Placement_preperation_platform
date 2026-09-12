const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const authenticate = require('../middleware/authMiddleware');
const {
  saveTargetJob,
  getTargetJob,
  deleteTargetJob,
} = require('../controllers/targetJobController');

// All routes require authenticated student/admin session
router.use(authenticate);

router.post('/', upload.single('jd'), saveTargetJob);
router.get('/', getTargetJob);
router.delete('/', deleteTargetJob);

module.exports = router;
