const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Resume = require('./src/models/Resume');
  const JobTarget = require('./src/models/JobTarget');
  const StudentProgress = require('./src/models/StudentProgress');
  const User = require('./src/models/User');

  const students = await User.find({ role: 'Student' }).sort({ createdAt: -1 }).limit(5);
  console.log(`Found ${students.length} recent students:`);

  for (const student of students) {
    console.log(`\n---------------------------------------`);
    console.log(`Student: ${student.name} (${student.email}) ID: ${student._id}`);
    const resume = await Resume.findOne({ $or: [{ userId: student._id }, { user: student._id }] });
    const target = await JobTarget.findOne({ userId: student._id });
    const progress = await StudentProgress.findOne({ userId: student._id });

    console.log('Resume rawText snippet:', resume ? resume.rawText.substring(0, 150) : 'NONE');
    console.log('Resume parsedSkills:', resume ? resume.parsedSkills : 'NONE');
    console.log('JobTarget company:', target ? target.company : 'NONE');
    console.log('JobTarget jd snippet:', target ? target.jobDescription.substring(0, 150) : 'NONE');
    console.log('JobTarget extractedSkills:', target ? target.extractedSkills : 'NONE');
    console.log('Progress aiAnalysisData:', progress?.aiAnalysisData ? JSON.stringify(progress.aiAnalysisData, null, 2) : 'NONE');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
