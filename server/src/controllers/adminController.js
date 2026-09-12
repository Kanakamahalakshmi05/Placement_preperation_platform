const User = require('../models/User');
const Resume = require('../models/Resume');

// @desc    Get admin dashboard overview statistics
// @route   GET /api/admin/overview
// @access  Private (Admin only)
const getAdminOverview = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const totalAdmins = await User.countDocuments({ role: 'Admin' });
    const totalResumes = await Resume.countDocuments({});

    // Fetch recent 10 students
    const recentStudents = await User.find({ role: 'Student' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalAdmins,
          totalResumes,
        },
        recentStudents,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of all students with resume status
// @route   GET /api/admin/students
// @access  Private (Admin only)
const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'Student' })
      .sort({ createdAt: -1 })
      .select('name email role createdAt');

    // Retrieve resume records for all students
    const studentIds = students.map((s) => s._id);
    const resumes = await Resume.find({
      $or: [{ userId: { $in: studentIds } }, { user: { $in: studentIds } }],
    }).select('userId user fileName parsedSkills skills uploadedAt createdAt');

    const resumeMap = new Map();
    resumes.forEach((r) => {
      const ownerId = (r.userId || r.user)?.toString();
      if (ownerId) resumeMap.set(ownerId, r);
    });

    const studentsWithResumes = students.map((student) => {
      const studentResume = resumeMap.get(student._id.toString());
      const skillsList = studentResume?.parsedSkills || studentResume?.skills || [];
      return {
        id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        createdAt: student.createdAt,
        hasResume: !!studentResume,
        resume: studentResume
          ? {
              fileName: studentResume.fileName,
              skillsCount: skillsList.length,
              skills: skillsList,
              uploadedAt: studentResume.uploadedAt || studentResume.createdAt,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: studentsWithResumes.length,
      data: studentsWithResumes,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getAllStudents,
};
