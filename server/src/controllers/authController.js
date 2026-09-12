const User = require('../models/User');
const { generateToken } = require('../utils/token');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Email address does not exist or is invalid. Please enter a valid email address.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists. Please sign in instead.',
      });
    }

    // Security check: Public registration strictly creates Student accounts.
    // Admin accounts require a verified admin secret key or internal administrative provisioning.
    let assignedRole = 'Student';
    if (req.body.role === 'Admin') {
      const validAdminSecret = process.env.ADMIN_SECRET_KEY || 'placement_admin_secret_2026';
      if (req.body.adminSecret && req.body.adminSecret === validAdminSecret) {
        assignedRole = 'Admin';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Public registration cannot create Admin accounts.',
        });
      }
    }

    // Create user with verified role (Student by default)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login existing user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Query user and explicitly include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email does not exist. Please check your email or register.',
      });
    }

    // Verify password using bcrypt compare
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private (All authenticated roles)
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

// @desc    Admin-only protected area
// @route   GET /api/auth/admin-area
// @access  Private (Admin only)
const adminArea = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Area. You have full administrative privileges.',
    accessLevel: 'Admin',
    user: {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role,
    },
  });
};

// @desc    Student-level protected area (Student and Admin)
// @route   GET /api/auth/student-area
// @access  Private (Student, Admin)
const studentArea = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Student Area. Placement preparation access granted.',
    accessLevel: 'Student or Admin',
    user: {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role,
    },
  });
};

module.exports = {
  register,
  login,
  getMe,
  adminArea,
  studentArea,
};
