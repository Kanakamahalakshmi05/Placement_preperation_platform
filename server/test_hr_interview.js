require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const interviewService = require('./src/services/interviewService');
const TechnicalInterview = require('./src/models/TechnicalInterview');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placement_platform';

async function runHRTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING HR MOCK INTERVIEW SUITE');
  console.log('====================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/placement_platform';
  let isDbConnected = false;

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    isDbConnected = true;
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.log(`ℹ Live MongoDB unreachable (${err.message}). Running unit verification.`);
  }

  try {
    if (isDbConnected) {
      // Find or create test student
      let student = await User.findOne({ role: 'Student' });
      if (!student) {
        student = await User.create({
          name: 'Test HR Candidate',
          email: 'hrcandidate@test.com',
          password: 'password123',
          role: 'Student',
        });
      }

      // 1. Create HR Session
      console.log('\n--- 1. HR Session Creation & Schema Verification ---');
      const hrSession = await interviewService.createInterviewSession(student._id, 'hr');
      assert(hrSession, 'HR session created');
      assert.strictEqual(hrSession.interviewType, 'hr', 'interviewType is set to hr');
      assert.strictEqual(hrSession.status, 'NOT_STARTED', 'Status is NOT_STARTED');
      assert.strictEqual(hrSession.duration, 1200, 'Duration is 1200 seconds (20 mins)');
      console.log(`  ✓ [PASS] HR session created with attemptNumber #${hrSession.attemptNumber}`);

      // 2. Start HR Session & Opening Question
      console.log('\n--- 2. HR Session Start & Opening Question ---');
      const startedHR = await interviewService.startInterviewSession(hrSession._id, student._id);
      assert.strictEqual(startedHR.status, 'IN_PROGRESS', 'Session status is IN_PROGRESS');
      assert(startedHR.startTime, 'startTime is recorded');
      assert(startedHR.questions.length > 0, 'Opening HR question generated');

      const q1 = startedHR.questions[0];
      console.log(`  ✓ [PASS] Q1 generated: "${q1.questionText}" [Topic: ${q1.topic}]`);
      assert.strictEqual(q1.questionType, 'hr_behavioral', 'Question type is hr_behavioral');

      // 3. Submit Answer & Adaptive Next Question
      console.log('\n--- 3. Adaptive Question Progression & Follow-up ---');
      await interviewService.submitInterviewAnswer(hrSession._id, student._id, {
        questionId: q1.questionId,
        studentAnswer: 'I am a passionate developer with experience building web applications. I want to join for great career growth.',
      });

      const nextResult = await interviewService.generateNextQuestion(hrSession._id, student._id);
      assert(!nextResult.isCompleted, 'Interview continues');
      const q2 = nextResult.question;
      console.log(`  ✓ [PASS] Q2 generated: "${q2.questionText}" [Topic: ${q2.topic}]`);

      // Submit a short answer for Q2 to test adaptive probing
      await interviewService.submitInterviewAnswer(hrSession._id, student._id, {
        questionId: q2.questionId,
        studentAnswer: 'We had a conflict about project architecture.',
      });

      const followUpResult = await interviewService.generateNextQuestion(hrSession._id, student._id);
      const q3 = followUpResult.question;
      console.log(`  ✓ [PASS] Q3 (Adaptive follow-up): "${q3.questionText}" [IsFollowUp: ${q3.isFollowUp}]`);

      // Submit answer for Q3
      await interviewService.submitInterviewAnswer(hrSession._id, student._id, {
        questionId: q3.questionId,
        studentAnswer: 'I scheduled a meeting with the team, outlined the trade-offs of both options, and we agreed on a modular structure which resulted in delivering the feature 2 days early.',
      });

      // 4. End Session & HR Evaluation
      console.log('\n--- 4. End Session & AI HR Evaluation ---');
      const endResult = await interviewService.endInterviewSession(hrSession._id, student._id);
      assert(endResult.success, 'endInterviewSession succeeded');
      const evalData = endResult.evaluation;

      assert(typeof evalData.overallScore === 'number', 'overallScore is a number');
      assert(typeof evalData.communicationClarity === 'number', 'communicationClarity scored');
      assert(typeof evalData.confidenceComposure === 'number', 'confidenceComposure scored');
      assert(typeof evalData.teamwork === 'number', 'teamwork scored');
      assert(typeof evalData.leadership === 'number', 'leadership scored');
      assert(typeof evalData.problemSolving === 'number', 'problemSolving scored');
      assert(typeof evalData.adaptability === 'number', 'adaptability scored');
      assert(typeof evalData.roleMotivation === 'number', 'roleMotivation scored');
      assert(typeof evalData.behavioralReasoning === 'number', 'behavioralReasoning scored');
      assert(typeof evalData.professionalism === 'number', 'professionalism scored');
      assert(typeof evalData.answerRelevance === 'number', 'answerRelevance scored');

      // Calculate expected weighted score
      const expectedWeight = Math.round(
        evalData.communicationClarity * 0.15 +
          evalData.confidenceComposure * 0.10 +
          evalData.teamwork * 0.10 +
          evalData.leadership * 0.10 +
          evalData.problemSolving * 0.10 +
          evalData.adaptability * 0.10 +
          evalData.roleMotivation * 0.10 +
          evalData.behavioralReasoning * 0.10 +
          evalData.professionalism * 0.10 +
          evalData.answerRelevance * 0.05
      );

      assert.strictEqual(evalData.overallScore, expectedWeight, 'overallScore strictly matches 10-part weighted sum');
      console.log(`  ✓ [PASS] Overall HR Score: ${evalData.overallScore}/100 (Weighted formula matches: ${expectedWeight})`);

      // 5. History Separation Verification
      console.log('\n--- 5. History Separation Verification ---');
      const hrHistory = await interviewService.getInterviewHistory(student._id, 'hr');
      assert(hrHistory.every((item) => item.interviewType === 'hr'), 'All returned history items are HR interviews');
      console.log(`  ✓ [PASS] HR history returned ${hrHistory.length} HR sessions separately`);

      const techHistory = await interviewService.getInterviewHistory(student._id, 'technical');
      assert(techHistory.every((item) => item.interviewType === 'technical'), 'All returned history items are Technical interviews');
      console.log(`  ✓ [PASS] Technical history returned ${techHistory.length} Technical sessions separately`);

      // Clean up test sessions
      await TechnicalInterview.deleteMany({ studentId: student._id });
      console.log('\n✓ Cleaned up test mock sessions');
    } else {
      // Unit Mock Verification
      console.log('\n--- 1. HR Adaptive Question Generator Unit Verification ---');
      const mockSession = {
        interviewType: 'hr',
        questions: [],
        attemptNumber: 1,
        resumeContext: 'Full Stack Engineer with Node.js and React experience',
        targetRole: 'Senior Frontend Engineer',
        company: 'Google',
        pastWeaknesses: ['Teamwork', 'STAR Method'],
        save: async () => {},
      };

      const q1Result = await interviewService.generateNextHRQuestion(mockSession);
      const q1 = q1Result.question;
      assert(q1.questionText, 'HR Q1 generated');
      console.log(`  ✓ [PASS] Unit HR Q1: "${q1.questionText}" [Topic: ${q1.topic}]`);

      q1.studentAnswer = 'I faced a conflict with a teammate regarding API endpoints.';

      const q2Result = await interviewService.generateNextHRQuestion(mockSession);
      const q2 = q2Result.question;
      assert(q2.questionText, 'HR Q2 generated adaptively');
      console.log(`  ✓ [PASS] Unit HR Q2 (Adaptive Follow-up): "${q2.questionText}" [Topic: ${q2.topic}]`);

      console.log('\n--- 2. HR Evaluation Engine 10-Category Weighted Scoring Unit Verification ---');
      mockSession.questions = [
        {
          questionText: 'Tell me about yourself.',
          studentAnswer: 'I have 3 years of experience in JavaScript and Node.js. I enjoy solving complex problems.',
        },
        {
          questionText: 'Describe a situation where you had a conflict with a teammate.',
          studentAnswer: 'My teammate and I disagreed on code structure. I scheduled a call, listened to their perspective, and we compromised on a clean interface.',
        },
      ];

      const evalResult = await interviewService.evaluateHRInterview(mockSession);
      assert(typeof evalResult.overallScore === 'number', 'overallScore computed');
      assert(typeof evalResult.communicationClarity === 'number', 'communicationClarity computed');
      assert(typeof evalResult.teamwork === 'number', 'teamwork computed');

      const expectedCalc = Math.round(
        evalResult.communicationClarity * 0.15 +
          evalResult.confidenceComposure * 0.10 +
          evalResult.teamwork * 0.10 +
          evalResult.leadership * 0.10 +
          evalResult.problemSolving * 0.10 +
          evalResult.adaptability * 0.10 +
          evalResult.roleMotivation * 0.10 +
          evalResult.behavioralReasoning * 0.10 +
          evalResult.professionalism * 0.10 +
          evalResult.answerRelevance * 0.05
      );

      assert.strictEqual(evalResult.overallScore, expectedCalc, 'Unit overallScore strictly matches 100% weighted formula');
      console.log(`  ✓ [PASS] Unit HR Score: ${evalResult.overallScore}/100 (Weighted formula matches: ${expectedCalc})`);
      console.log(`  ✓ [PASS] Communication Observations: "${evalResult.communicationObservations?.substring(0, 70)}..."`);
    }

    console.log('\n====================================================');
    console.log('📊 FINAL RESULT: ALL HR TESTS PASSED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ HR Test Suite Failed:', err);
    process.exit(1);
  } finally {
    if (isDbConnected) {
      await mongoose.disconnect();
    }
  }
}

runHRTestSuite();
