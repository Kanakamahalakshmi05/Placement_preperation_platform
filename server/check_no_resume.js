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

  const u = await User.findOne({ email: 'student_1789128422289@example.com' });
  console.log('User found:', u._id, u.email);
  const r = await Resume.findOne({ $or: [{ userId: u._id }, { user: u._id }] });
  console.log('Resume query result for user without resume:', r);

  // Check all users to see which user has no resume:
  const allUsers = await User.find({});
  for (const user of allUsers) {
    const res = await Resume.findOne({ $or: [{ userId: user._id }, { user: user._id }] });
    if (!res) {
      console.log('User WITHOUT resume in DB:', user.email, 'ID:', user._id);
    }
  }
  process.exit(0);
})();
