const express = require('express');
const router = express.Router();
const { getAdminOverview, getAllStudents } = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/rbacMiddleware');

// All routes in this router require authentication and Admin role
router.use(authenticate);
router.use(authorizeRoles('Admin'));

router.get('/overview', getAdminOverview);
router.get('/students', getAllStudents);

module.exports = router;
