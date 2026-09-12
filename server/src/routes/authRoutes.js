const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  adminArea,
  studentArea,
} = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/rbacMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (All authenticated users: Student, Admin)
router.get('/me', authenticate, getMe);

// Role-protected routes (RBAC: Student vs Admin)
router.get('/student-area', authenticate, authorizeRoles('Student', 'Admin'), studentArea);
router.get('/admin-area', authenticate, authorizeRoles('Admin'), adminArea);

module.exports = router;
