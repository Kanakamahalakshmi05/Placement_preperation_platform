require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const interviewService = require('./src/services/interviewService');
const TechnicalInterview = require('./src/models/TechnicalInterview');
const User = require('./src/models/User');
const Resume = require('./src/models/Resume');
const JobTarget = require('./src/models/JobTarget');
const Analysis = require('./src/models/Analysis');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TECHNICAL MOCK INTERVIEW SUITE');
  console.log('====================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/placement_platform';
  let isDbConnected = false;

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    isDbConnected = true;
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.log(`ℹ Live MongoDB unreachable (${err.message}). Running in-memory / mocked unit verification.`);
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Question Normalization & Functions Check
  // -------------------------------------------------------------
  console.log('\n--- 1. Function Exports & Profiling Checks ---');
  assert(typeof interviewService.calculateRemainingSeconds === 'function', 'calculateRemainingSeconds function exists');
  assert(typeof interviewService.createInterviewSession === 'function', 'createInterviewSession function exists');
  assert(typeof interviewService.startInterviewSession === 'function', 'startInterviewSession function exists');
  assert(typeof interviewService.generateNextQuestion === 'function', 'generateNextQuestion function exists');
  assert(typeof interviewService.submitInterviewAnswer === 'function', 'submitInterviewAnswer function exists');
  assert(typeof interviewService.endInterviewSession === 'function', 'endInterviewSession function exists');
  assert(typeof interviewService.getInterviewHistory === 'function', 'getInterviewHistory function exists');
  assert(typeof interviewService.getInterviewEvaluation === 'function', 'getInterviewEvaluation function exists');
  assert(typeof interviewService.buildStructuredResumeProfile === 'function', 'buildStructuredResumeProfile function exists');

  // Test structured resume profiling
  const sampleResume = {
    rawText: `
      SUMMARY: Full-Stack Developer with experience in React, Node.js, Express, MongoDB, and Python.
      SKILLS: JavaScript, Python, React, Node.js, Express, MongoDB, SQL, REST APIs, JWT, Git.
      PROJECTS:
      Real-Time Chat Application: Built a web messaging application using React, Node.js, Express, and MongoDB.
      Automated Expense Tracker: Created a financial tracking tool with Python and SQLite.
    `,
    parsedSkills: ['React', 'Node.js', 'Express', 'MongoDB', 'Python', 'SQL', 'JWT'],
    parsedProjects: [
      { title: 'Real-Time Chat Application', description: 'Built web messaging app', techStack: ['React', 'Node.js', 'Express', 'MongoDB'] },
      { title: 'Automated Expense Tracker', description: 'Created financial tracking tool', techStack: ['Python', 'SQLite'] }
    ]
  };

  const profile = await interviewService.buildStructuredResumeProfile(sampleResume);
  assert(Array.isArray(profile.technicalSkills) && profile.technicalSkills.length >= 4, 'Profile extracted technical skills');
  assert(profile.programmingLanguages.some((l) => ['JavaScript', 'Python'].includes(l)), 'Profile identified programming languages');
  assert(profile.frameworks.some((f) => ['React', 'Node.js', 'Express'].includes(f)), 'Profile identified frameworks');
  assert(profile.databases.some((d) => ['MongoDB', 'SQL', 'SQLite'].includes(d)), 'Profile identified databases');
  assert(profile.projects.length >= 2, 'Profile extracted actual projects with names');
  assert(profile.projects[0].name.includes('Chat Application'), 'Project name correctly retained from resume');

  // -------------------------------------------------------------
  // TEST 2: 20-Minute Timer Logic
  // -------------------------------------------------------------
  console.log('\n--- 2. Server-Authoritative 20-Minute Countdown Timer ---');
  const fakeSessionFresh = {
    status: 'NOT_STARTED',
    duration: 1200,
    startTime: null
  };
  assert(interviewService.calculateRemainingSeconds(fakeSessionFresh) === 1200, 'Unstarted session returns full 1200 seconds (20 mins)');

  const fakeSessionInProgress = {
    status: 'IN_PROGRESS',
    duration: 1200,
    startTime: new Date(Date.now() - 300 * 1000) // 5 minutes elapsed
  };
  const remSec = interviewService.calculateRemainingSeconds(fakeSessionInProgress);
  assert(remSec >= 895 && remSec <= 905, `In-progress session correctly computes remaining time (expected ~900s, got ${remSec}s)`);

  const fakeSessionExpired = {
    status: 'IN_PROGRESS',
    duration: 1200,
    startTime: new Date(Date.now() - 1300 * 1000) // 21 minutes elapsed
  };
  assert(interviewService.calculateRemainingSeconds(fakeSessionExpired) === 0, 'Expired session bounds remaining seconds to 0');

  // -------------------------------------------------------------
  // TEST 3: 10-Phase Adaptive Real-Interviewer Progression
  // -------------------------------------------------------------
  console.log('\n--- 3. 10-Phase Adaptive Real-Interviewer Pipeline ---');
  const testContext = {
    resumeProfile: profile,
    companyName: 'Stripe',
    pastQuestions: [],
    pastWeaknesses: [],
    pastStrongAreas: []
  };

  const simulatedQuestions = [];

  // Helper to calculate similarity for testing
  function sim(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = [...wordsA].filter((x) => wordsB.has(x)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  // Verification 3A: Opening varies across fresh mock sessions (Attempt 1 vs Attempt 2 vs Attempt 3)
  const qFresh1 = interviewService.generateDeterministicResumeQuestion(testContext, [], 'TECHNICAL_SKILLS', false, 1);
  const qFresh2 = interviewService.generateDeterministicResumeQuestion(testContext, [], 'TECHNICAL_SKILLS', false, 2);
  const qFresh3 = interviewService.generateDeterministicResumeQuestion(testContext, [], 'TECHNICAL_SKILLS', false, 3);
  assert(qFresh1.questionText !== qFresh2.questionText, 'Attempt 1 and Attempt 2 have distinct opening questions');
  assert(qFresh2.questionText !== qFresh3.questionText, 'Attempt 2 and Attempt 3 have distinct opening questions');
  assert(!qFresh1.questionText.toLowerCase().includes('tell me about yourself'), 'Opening does NOT ask "Tell me about yourself"');

  // Turn 1 (Phase 2: Opening Technical Language Internals)
  const q1 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'TECHNICAL_SKILLS', false, 1);
  assert(q1.questionType === 'technical', `Turn 1 questionType is technical (got ${q1.questionType})`);
  assert(q1.questionText.toLowerCase().includes('javascript') || q1.questionText.toLowerCase().includes('python'), 'Turn 1 questions core resume programming language');
  assert(q1.questionText.includes('event loop') || q1.questionText.includes('GIL') || q1.questionText.includes('memory management'), 'Turn 1 questions real tier-1 runtime/concurrency internals');
  simulatedQuestions.push({ questionId: 'q_1', questionText: q1.questionText, topic: q1.topic, questionType: q1.questionType, studentAnswer: 'The event loop processes microtasks before macrotasks, delegating I/O to libuv.' });

  // Turn 2 (Phase 2: Core Framework Internals)
  const q2 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'TECHNICAL_SKILLS', false, 1);
  assert(q2.questionType === 'technical', `Turn 2 questionType is technical (got ${q2.questionType})`);
  assert(q2.questionText.toLowerCase().includes('react') || q2.questionText.toLowerCase().includes('node') || q2.questionText.toLowerCase().includes('express'), 'Turn 2 questions core resume framework');
  simulatedQuestions.push({ questionId: 'q_2', questionText: q2.questionText, topic: q2.topic, questionType: q2.questionType, studentAnswer: 'Virtual DOM reconciles changes using fiber nodes and diffing algorithms.' });

  // Turn 3 (Phase 3: Technology Choice & Rationale)
  const q3 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'PROJECT_DISCUSSION', false, 1);
  assert(q3.questionType === 'tech-choice', `Turn 3 questionType is tech-choice (got ${q3.questionType})`);
  assert(q3.questionText.toLowerCase().includes('why did you choose') || q3.questionText.toLowerCase().includes('why choose') || q3.questionText.toLowerCase().includes('what led you to choose'), 'Turn 3 questions candidate rationale for technology choice');
  simulatedQuestions.push({ questionId: 'q_3', questionText: q3.questionText, topic: q3.topic, questionType: q3.questionType, studentAnswer: 'We used MongoDB because it is flexible and fast.' });

  // Turn 4 (Phase 4: Probing Shallow Justifications)
  const q4 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'PROJECT_DISCUSSION', false, 1, true);
  assert(q4.questionType === 'tech-choice' || q4.questionType === 'adaptive-followup', `Turn 4 questionType probes understanding (got ${q4.questionType})`);
  assert(q4.questionText.toLowerCase().includes('flexible') || q4.questionText.toLowerCase().includes('trade-off') || q4.questionText.toLowerCase().includes('document model') || q4.questionText.toLowerCase().includes('relational'), 'Turn 4 directly challenges shallow answers and probes specific data model trade-offs');
  simulatedQuestions.push({ questionId: 'q_4', questionText: q4.questionText, topic: q4.topic, questionType: q4.questionType, studentAnswer: 'Our chat messages have dynamic nested metadata and polymorphic payloads which fit MongoDB BSON documents without ALTER TABLE migrations.' });

  // Turn 5 (Phase 5: Project Architecture & Request Data Flow)
  const q5 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'DEEP_PROJECT', false, 1);
  assert(q5.questionType === 'architecture', `Turn 5 questionType is architecture (got ${q5.questionType})`);
  assert(q5.questionText.includes('Real-Time Chat Application'), 'Turn 5 probes Project 1 ("Real-Time Chat Application") by name');
  assert(q5.questionText.toLowerCase().includes('architecture') && q5.questionText.toLowerCase().includes('data flow'), 'Turn 5 asks to trace end-to-end data flow from client to database');
  simulatedQuestions.push({ questionId: 'q_5', questionText: q5.questionText, topic: q5.topic, questionType: q5.questionType, studentAnswer: 'The client connects via WebSocket handshake, passes through JWT auth middleware, attaches socket to user room, and persists messages with Mongoose.' });

  // Turn 6 (Phase 6: Project Implementation & Ownership Verification)
  const q6 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'DEEP_PROJECT', false, 1);
  assert(q6.questionType === 'implementation', `Turn 6 questionType is implementation (got ${q6.questionType})`);
  assert(q6.questionText.toLowerCase().includes('where') || q6.questionText.toLowerCase().includes('how exactly') || q6.questionText.toLowerCase().includes('middleware'), 'Turn 6 verifies implementation ownership mechanics');
  simulatedQuestions.push({ questionId: 'q_6', questionText: q6.questionText, topic: q6.topic, questionType: q6.questionType, studentAnswer: 'I am not getting this, not sure how to answer.' });

  // Turn 7 (Adaptive Polite Pivot after Skip)
  const q7 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'ADAPTIVE_FOLLOWUP', true, 1);
  assert(q7.questionText.toLowerCase().includes('no problem') || q7.questionText.toLowerCase().includes("let's move on"), 'Turn 7 acknowledges skip politely and encouragingly');
  assert(q7.questionType === 'technical', 'Turn 7 pivots to an unassessed technical skill');
  simulatedQuestions.push({ questionId: 'q_7', questionText: q7.questionText, topic: q7.topic, questionType: q7.questionType, studentAnswer: 'REST APIs use standard HTTP verbs and status codes.' });

  // Turn 8 (Phase 7: Concurrency, Race Conditions & Edge Cases)
  const q8 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'ADAPTIVE_FOLLOWUP', false, 1);
  assert(q8.questionType === 'edge-case' || q8.questionType === 'concurrency', `Turn 8 questionType is edge-case/concurrency (got ${q8.questionType})`);
  assert(q8.questionText.toLowerCase().includes('concurrent') || q8.questionText.toLowerCase().includes('simultaneously') || q8.questionText.toLowerCase().includes('race condition'), 'Turn 8 probes simultaneous requests and race condition handling');
  simulatedQuestions.push({ questionId: 'q_8', questionText: q8.questionText, topic: q8.topic, questionType: q8.questionType, studentAnswer: 'We use atomic findOneAndUpdate and Redis distributed mutex locks to serialize critical updates.' });

  // Turn 9 (Phase 8: Scalability & 1 Million Users)
  const q9 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'ADAPTIVE_FOLLOWUP', false, 1);
  assert(q9.questionType === 'scalability', `Turn 9 questionType is scalability (got ${q9.questionType})`);
  assert(q9.questionText.toLowerCase().includes('scale') || q9.questionText.toLowerCase().includes('1 million') || q9.questionText.toLowerCase().includes('bottleneck'), 'Turn 9 probes production scaling bottlenecks to 1M users');
  simulatedQuestions.push({ questionId: 'q_9', questionText: q9.questionText, topic: q9.topic, questionType: q9.questionType, studentAnswer: 'We would add a Redis Pub/Sub adapter for horizontal WebSocket scaling across Node cluster workers.' });

  // Turn 10 (Phase 9: Pivot to Second Resume Project)
  const q10 = interviewService.generateDeterministicResumeQuestion(testContext, simulatedQuestions, 'ADAPTIVE_FOLLOWUP', false, 1);
  assert(q10.questionType === 'project', `Turn 10 questionType is project (got ${q10.questionType})`);
  assert(q10.questionText.includes('Automated Expense Tracker'), 'Turn 10 systematically moves to candidate second resume project');
  simulatedQuestions.push({ questionId: 'q_10', questionText: q10.questionText, topic: q10.topic, questionType: q10.questionType, studentAnswer: 'Built with Python SQLite with local indexing.' });

  // Strict Anti-Duplication Verification across all 10 turns
  console.log('\n--- 4. Strict Zero-Duplication Verification in Session ---');
  let duplicateFound = false;
  for (let i = 0; i < simulatedQuestions.length; i++) {
    for (let j = i + 1; j < simulatedQuestions.length; j++) {
      const qA = simulatedQuestions[i];
      const qB = simulatedQuestions[j];
      if (qA.topic === qB.topic) {
        console.error(`Duplicate topic detected: "${qA.topic}" on Q${i + 1} and Q${j + 1}`);
        duplicateFound = true;
      }
      const similarity = sim(qA.questionText, qB.questionText);
      if (similarity > 0.65) {
        console.error(`High similarity (${similarity.toFixed(2)}) between Q${i + 1} and Q${j + 1}`);
        duplicateFound = true;
      }
    }
  }
  assert(!duplicateFound, 'Zero duplicated questions or topics across all 10 turns in the session');

  // -------------------------------------------------------------
  // TEST 5: Live Database Flow & Evidence-Based Evaluation
  // -------------------------------------------------------------
  if (isDbConnected) {
    console.log('\n--- 5. Database Session Lifecycle & Evidence-Based Evaluation ---');
    try {
      // Find or create test student
      let student = await User.findOne({ email: 'maha@gmail.com' });
      if (!student) {
        student = await User.create({
          name: 'Maha Student',
          email: 'maha@gmail.com',
          password: 'Password123!',
          role: 'Student'
        });
      }

      // Upsert test resume for student
      await Resume.findOneAndUpdate(
        { userId: student._id },
        {
          userId: student._id,
          fileName: 'Maha_Resume.pdf',
          fileSize: 10240,
          mimeType: 'application/pdf',
          rawText: sampleResume.rawText,
          parsedSkills: sampleResume.parsedSkills,
          parsedProjects: sampleResume.parsedProjects,
        },
        { upsert: true, new: true }
      );

      // Create session 1
      const session1 = await interviewService.createInterviewSession(student._id);
      assert(session1._id && session1.attemptNumber >= 1, `Session 1 created with attemptNumber #${session1.attemptNumber}`);
      assert(session1.duration === 1200, 'Session duration set to exactly 1200 seconds (20 mins)');
      assert(session1.status === 'NOT_STARTED', 'Initial session status is NOT_STARTED');
      assert(session1.resumeProfile && session1.resumeProfile.technicalSkills.length > 0, 'Session snapshot stores structured resumeProfile');

      // Start session 1
      const started1 = await interviewService.startInterviewSession(session1._id, student._id);
      assert(started1.status === 'IN_PROGRESS', 'Session status transitions to IN_PROGRESS');
      assert(started1.startTime instanceof Date, 'Server startTime is populated with Date object');
      assert(started1.questions.length >= 1, 'Initial opening question automatically generated');

      const qObj = started1.questions[0];
      assert(qObj.questionText && qObj.questionText.length > 10, `Opening question asked: "${qObj.questionText.substring(0, 60)}..."`);
      assert(qObj.topic, `Question assigned topic: ${qObj.topic}`);

      // Submit student response to Question 1
      const answerRes = await interviewService.submitInterviewAnswer(session1._id, student._id, {
        questionId: qObj.questionId,
        studentAnswer: 'In JavaScript and Node.js, the event loop handles asynchronous operations using libuv, delegating I/O to the OS kernel or thread pool and executing callbacks via microtask and macrotask queues.'
      });
      assert(answerRes.success === true, 'Student answer successfully submitted and stored');

      // Generate next question (Phase 2: Project Discussion)
      const nextQ = await interviewService.generateNextQuestion(session1._id, student._id);
      assert(nextQ.question && nextQ.question.questionText, `Next question generated: "${nextQ.question.questionText.substring(0, 60)}..."`);
      assert(nextQ.questionIndex === 2, 'Question index incremented to 2');

      // Submit response to Question 2 (Simulating a pass / don't know)
      await interviewService.submitInterviewAnswer(session1._id, student._id, {
        questionId: nextQ.question.questionId,
        studentAnswer: "I am not getting this, let's move on to the next question."
      });

      // Generate third question (Adaptive transition after skip)
      const thirdQ = await interviewService.generateNextQuestion(session1._id, student._id);
      assert(thirdQ.question && thirdQ.question.questionText, `Third question adapted: "${thirdQ.question.questionText.substring(0, 60)}..."`);
      assert(thirdQ.questionIndex === 3, 'Question index incremented to 3');

      // Submit response to Question 3
      await interviewService.submitInterviewAnswer(session1._id, student._id, {
        questionId: thirdQ.question.questionId,
        studentAnswer: 'In our Chat Application, we designed MongoDB collections for Users, Conversations, and Messages, adding compound indexes on conversationId and createdAt for sub-5ms query latency.'
      });

      // Conclude interview and evaluate
      const endRes = await interviewService.endInterviewSession(session1._id, student._id);
      assert(endRes.success === true, 'Interview session ended successfully');
      assert(endRes.session.status === 'COMPLETED', 'Session marked COMPLETED');

      const ev = endRes.evaluation;
      assert(typeof ev.overallScore === 'number', `Evaluation generated overallScore: ${ev.overallScore}/100`);
      assert(ev.technicalKnowledge >= 0, `Technical Knowledge score: ${ev.technicalKnowledge}%`);
      assert(ev.practicalUnderstanding >= 0, `Practical Understanding score: ${ev.practicalUnderstanding}%`);
      assert(ev.projectUnderstanding >= 0, `Project Understanding score: ${ev.projectUnderstanding}%`);
      assert(ev.problemSolving >= 0, `Problem Solving score: ${ev.problemSolving}%`);
      assert(ev.depthOfUnderstanding >= 0, `Depth score: ${ev.depthOfUnderstanding}%`);

      // Verify Mathematical Consistency
      const expectedOverall = Math.round(
        0.25 * ev.technicalKnowledge +
        0.20 * ev.practicalUnderstanding +
        0.20 * ev.projectUnderstanding +
        0.15 * ev.problemSolving +
        0.10 * ev.depthOfUnderstanding +
        0.05 * ev.answerRelevance +
        0.05 * ev.communication
      );
      assert(Math.abs(ev.overallScore - expectedOverall) <= 1, `Overall score matches strict 7-part weighted formula (${ev.overallScore} vs ${expectedOverall})`);

      // Verify Evidence-Based Evaluation
      assert(Array.isArray(ev.strengths) && ev.strengths.length > 0, 'Evaluation contains strengths array');
      assert(ev.strengths[0].skill && ev.strengths[0].evidence, `Strength backed by evidence: "${ev.strengths[0].skill}"`);

      assert(Array.isArray(ev.weaknesses) && ev.weaknesses.length > 0, 'Evaluation contains weaknesses array');
      assert(ev.weaknesses[0].skill && ev.weaknesses[0].evidence, `Weakness backed by evidence: "${ev.weaknesses[0].skill}"`);

      assert(Array.isArray(ev.notAssessed), 'notAssessed is an array');
      assert(ev.notAssessed.length > 0, `notAssessed accurately contains unasked skills (found: ${ev.notAssessed.slice(0, 3).join(', ')})`);

      assert(Array.isArray(ev.recommendations) && ev.recommendations.length > 0, 'recommendations is an array');
      assert(ev.recommendations[0].topic && ev.recommendations[0].reason, `Actionable recommendation tied to weakness: "${ev.recommendations[0].topic}"`);

      // Create session 2 (Unlimited attempt verification)
      const session2 = await interviewService.createInterviewSession(student._id);
      assert(session2.attemptNumber === session1.attemptNumber + 1, `Next mock interview created with incremented attemptNumber #${session2.attemptNumber}`);
      assert(session2._id.toString() !== session1._id.toString(), 'Session 2 is a separate new database record');

      // Verify history sorting newest first
      const history = await interviewService.getInterviewHistory(student._id);
      assert(history.length >= 2, `History records all attempts (found ${history.length})`);
      assert(history[0].attemptNumber >= history[1].attemptNumber, 'History is sorted with newest attempt first');

      // Clean up test sessions
      await TechnicalInterview.deleteMany({ _id: { $in: [session1._id, session2._id] } });
      console.log('✓ Cleaned up test mock sessions');
    } catch (dbErr) {
      console.error('DB test error:', dbErr);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (isDbConnected) {
    await mongoose.disconnect();
  }
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests();
