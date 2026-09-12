const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { checkAIStatus } = require('./config/aiConfig');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const targetJobRoutes = require('./routes/targetJobRoutes');
const quizRoutes = require('./routes/quizRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin (curl/Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost/127.0.0.1 origin during development
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin === process.env.CLIENT_URL
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked by server'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    success: true,
    message: 'AI Placement Preparation Platform Server API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        readyState: dbState
      },
      aiService: checkAIStatus()
    }
  });
});

// Database Connectivity Guard Middleware - prevents 10000ms buffer timeouts
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/health')) return next();

  if (mongoose.connection.readyState !== 1) {
    // If disconnected, attempt a fast reconnection in case IP was recently whitelisted
    if (mongoose.connection.readyState === 0) {
      const connected = await connectDB();
      if (connected && mongoose.connection.readyState === 1) {
        return next();
      }
    }
    return res.status(503).json({
      success: false,
      message:
        'Database connection failed: Your IP address is not whitelisted in MongoDB Atlas. ' +
        'Please go to MongoDB Atlas -> Network Access and add your current IP address (or allow access from anywhere: 0.0.0.0/0).'
    });
  }
  next();
});

// Authentication & RBAC Routes
app.use('/api/auth', authRoutes);

// Student Resume Upload & Parsing Routes
app.use('/api/resume', resumeRoutes);

// Student Dashboard & Feature Routes
app.use('/api/student', studentRoutes);

// Target Job & Drive Date Routes
app.use('/api/target-job', targetJobRoutes);

// Dynamic Mock Quiz Routes
app.use('/api/quizzes', quizRoutes);

// Technical Mock Interview Routes
app.use('/api/interviews', interviewRoutes);

// Administrative Routes (Admin role only)
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
