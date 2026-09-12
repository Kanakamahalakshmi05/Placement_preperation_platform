const mongoose = require('mongoose');
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  const Resume = require('./src/models/Resume');
  const JobTarget = require('./src/models/JobTarget');
  const StudentProgress = require('./src/models/StudentProgress');

  const users = await User.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('--- RECENT 10 USERS ---');
  for (const u of users) {
    const r = await Resume.findOne({ $or: [{ userId: u._id }, { user: u._id }] });
    const jt = await JobTarget.findOne({ userId: u._id });
    const sp = await StudentProgress.findOne({ userId: u._id });
    console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      resume: r ? r.fileName : null,
      targetJob: jt ? jt.jobTitle : null,
      stage: sp ? sp.aiAnalysisCompleted : null,
    });
  }

  const allResumes = await Resume.find({});
  console.log('\n--- ALL RESUMES IN DB (' + allResumes.length + ') ---');
  for (const r of allResumes) {
    console.log({
      id: r._id,
      userId: r.userId,
      userField: r.user,
      fileName: r.fileName,
      uploadedAt: r.uploadedAt || r.createdAt,
    });
  }
  process.exit(0);
})();
