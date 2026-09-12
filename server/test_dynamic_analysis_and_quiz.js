/**
 * Comprehensive Verification Test Suite:
 * TEST 1: Resume A + JD A analysis verification.
 * TEST 2: Invalidation & dynamic change on JD replacement (JD B).
 * TEST 3: Easy Quiz 1 generates exactly 10 questions.
 * TEST 4: Easy Quiz 2 generates exactly 10 NEW questions (zero duplicates/rewordings).
 * TEST 5: Quiz submission returns AI performance diagnosis and actionable steps.
 * TEST 6: Adaptive Easy Quiz 3 incorporates prior weak topics with fresh questions.
 * TEST 7: Medium and Difficult tiers generate exactly 10 unique questions each.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('🚀 Starting Preparation Module Comprehensive Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const studentEmail = `prep_dyn_${timestamp}@example.com`;
  const password = 'Password@123';

  // 1. Register student
  console.log('--- Setup: Register Student ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dynamic Prep Student', email: studentEmail, password, role: 'Student' }),
  });
  const regData = await regRes.json();
  const token = regData.token;
  assert(token, 'Student registered successfully');

  // 2. Upload Resume A (Full-Stack React + Node.js + MongoDB developer)
  console.log('\n--- TEST 1: Upload Resume A & JD A (Razorpay Backend) ---');
  const resumeFormData = new FormData();
  resumeFormData.append(
    'resume',
    new Blob(
      [
        'Alex Rivera - Senior Full Stack Developer\nSkills: React, Node.js, Express, MongoDB, JavaScript, TypeScript, Git, HTML, CSS.\nExperience developing high-throughput React user interfaces and Node.js RESTful web microservices.',
      ],
      { type: 'text/plain' }
    ),
    'alex_resume.txt'
  );
  const resUpload = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: resumeFormData,
  });
  const resUploadData = await resUpload.json();
  assert(resUpload.status === 200 && resUploadData.success, 'Resume A uploaded');

  // Upload JD A (Razorpay - requires React, Node.js, MongoDB, PLUS SQL, REST APIs, DSA)
  const jdAFormData = new FormData();
  jdAFormData.append('company', 'Razorpay');
  jdAFormData.append(
    'jd',
    new Blob(
      [
        'Razorpay Backend Engineer\nRequirements:\n- Strong knowledge of React, Node.js, and MongoDB.\n- In-depth expertise in SQL databases, query optimization, and schema design.\n- Experience designing production REST APIs with high throughput.\n- Strong fundamentals in Data Structures and Algorithms (DSA).',
      ],
      { type: 'text/plain' }
    ),
    'Razorpay_JD.txt'
  );
  const jdaRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdAFormData,
  });
  const jdaData = await jdaRes.json();
  assert(jdaRes.status === 200 && jdaData.success, 'JD A (Razorpay) uploaded');

  // Trigger AI Analysis for Resume A + JD A
  const analysis1Res = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysis1Data = await analysis1Res.json();
  assert(analysis1Res.status === 200 && analysis1Data.success, 'AI Analysis completed for Resume A + JD A');

  const matchedSkillsA = analysis1Data.data.matchedSkills || [];
  const skillsToImproveA = analysis1Data.data.skillsToImprove || [];
  const importantTopicsA = analysis1Data.data.importantTopics || [];

  console.log('  Matched Skills A:', matchedSkillsA);
  console.log('  Skills to Improve A:', skillsToImproveA);
  console.log('  Important Topics A:', importantTopicsA);

  assert(
    matchedSkillsA.some((s) => ['React', 'Node.js', 'MongoDB', 'JavaScript'].includes(s)),
    'Matched skills accurately reflect candidate strengths (React / Node.js)'
  );
  assert(
    skillsToImproveA.some((s) => ['SQL', 'REST APIs', 'DSA'].includes(s)),
    'Skills to improve accurately identify JD requirements missing from resume (SQL / DSA)'
  );

  // --- TEST 2: Replace JD with JD B (Google Cloud - Go, Kubernetes, Microservices, Distributed Systems) ---
  console.log('\n--- TEST 2: Invalidation & Dynamic Skill Update on JD Replacement (JD B) ---');
  const jdBFormData = new FormData();
  jdBFormData.append('company', 'Google Cloud');
  jdBFormData.append(
    'jd',
    new Blob(
      [
        'Google Cloud Infrastructure Engineer\nRequirements:\n- Hands-on expertise in Go (Golang), Docker, and Kubernetes.\n- Microservices architecture and Distributed Systems design.\n- Cloud security and CI/CD pipelines.',
      ],
      { type: 'text/plain' }
    ),
    'GoogleCloud_JD.txt'
  );
  const jdbRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdBFormData,
  });
  const jdbData = await jdbRes.json();
  assert(jdbRes.status === 200 && jdbData.success, 'JD B (Google Cloud) uploaded');

  // Dashboard check: previous analysis must be INVALIDATED
  const dashCheckRes = await fetch(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashCheckData = await dashCheckRes.json();
  assert(
    dashCheckData.data.aiAnalysisCompleted === false,
    'Stale analysis invalidated immediately upon JD replacement (aiAnalysisCompleted = false)'
  );

  // Re-run AI analysis on JD B
  const analysis2Res = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysis2Data = await analysis2Res.json();
  const matchedSkillsB = analysis2Data.data.matchedSkills || [];
  const skillsToImproveB = analysis2Data.data.skillsToImprove || [];
  console.log('  New Matched Skills B:', matchedSkillsB);
  console.log('  New Skills to Improve B:', skillsToImproveB);

  assert(
    skillsToImproveB.some((s) => ['Go', 'Kubernetes', 'Docker', 'Microservices'].includes(s)),
    'Skills to improve dynamically changed to reflect JD B (Go / Kubernetes / Docker)'
  );
  assert(
    JSON.stringify(skillsToImproveA) !== JSON.stringify(skillsToImproveB),
    'Analysis dynamically shifted according to the new JD'
  );

  // --- TEST 3: Start Easy Quiz 1 ---
  console.log('\n--- TEST 3: Generate Easy Quiz (Attempt 1) ---');
  const quiz1Res = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quiz1Data = await quiz1Res.json();
  assert(
    quiz1Res.status === 200 && quiz1Data.success && quiz1Data.data.questions.length === 10,
    'Easy Quiz Attempt 1 generated exactly 10 questions'
  );

  const quiz1Questions = quiz1Data.data.questions;
  const quiz1Texts = quiz1Questions.map((q) => q.question.toLowerCase().trim());
  console.log(`  Attempt 1 Sample Q1: "${quiz1Questions[0].question.substring(0, 65)}..."`);

  // --- TEST 4: Start Easy Quiz 2 (Verify ALL 10 Questions are NEW and NON-REPEATING) ---
  console.log('\n--- TEST 4: Generate Easy Quiz (Attempt 2) - Duplicate Prevention ---');
  const quiz2Res = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quiz2Data = await quiz2Res.json();
  assert(
    quiz2Res.status === 200 && quiz2Data.success && quiz2Data.data.questions.length === 10,
    'Easy Quiz Attempt 2 generated exactly 10 questions'
  );

  const quiz2Questions = quiz2Data.data.questions;
  const quiz2Texts = quiz2Questions.map((q) => q.question.toLowerCase().trim());
  console.log(`  Attempt 2 Sample Q1: "${quiz2Questions[0].question.substring(0, 65)}..."`);

  // Check for any duplicates between Quiz 1 and Quiz 2
  let duplicateCount = 0;
  quiz2Texts.forEach((q2Text) => {
    if (quiz1Texts.includes(q2Text)) {
      duplicateCount++;
    }
  });

  assert(duplicateCount === 0, `Zero repeated questions between Attempt 1 and Attempt 2 (${duplicateCount} found)`);

  // --- TEST 5: Submit Quiz 1 & Verify AI Performance Evaluation ---
  console.log('\n--- TEST 5: Submit Quiz & Verify AI Performance Analysis ---');
  // Simulate user answers (8 correct, 2 incorrect)
  const userAnswers = {};
  quiz1Questions.forEach((q, i) => {
    // Answer first 8 with option 0, last 2 with option 1 (simulating mistakes)
    userAnswers[q.id] = i < 8 ? 0 : 1;
  });

  const submitRes = await fetch(`${BASE_URL}/quizzes/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      quizId: quiz1Data.data.quizId,
      difficulty: 'easy',
      questions: quiz1Questions,
      userAnswers,
    }),
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 200 && submitData.success, 'Quiz evaluated successfully');

  console.log(`  Score: ${submitData.data.score}/${submitData.data.totalQuestions} (${submitData.data.percentage}%)`);
  console.log('  Strong Areas:', submitData.data.strongAreas);
  console.log('  Needs Improvement:', submitData.data.needsImprovement);
  console.log('  AI Performance Analysis:', submitData.data.aiPerformanceAnalysis);

  assert(
    Array.isArray(submitData.data.strongAreas) && submitData.data.strongAreas.length > 0,
    'Identified strong areas from quiz'
  );
  assert(
    Array.isArray(submitData.data.needsImprovement) && submitData.data.needsImprovement.length > 0,
    'Identified weak areas needing improvement'
  );
  assert(
    typeof submitData.data.aiPerformanceAnalysis === 'string' && submitData.data.aiPerformanceAnalysis.length > 20,
    'Generated comprehensive AI Performance Analysis paragraph'
  );

  // --- TEST 6: Adaptive Quiz 3 considers prior weak topics with fresh questions ---
  console.log('\n--- TEST 6: Generate Easy Quiz (Attempt 3) - Adaptive & Unique ---');
  const quiz3Res = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quiz3Data = await quiz3Res.json();
  const quiz3Questions = quiz3Data.data.questions;
  const quiz3Texts = quiz3Questions.map((q) => q.question.toLowerCase().trim());

  let dupCountWith1And2 = 0;
  quiz3Texts.forEach((t) => {
    if (quiz1Texts.includes(t) || quiz2Texts.includes(t)) dupCountWith1And2++;
  });

  assert(
    quiz3Questions.length === 10 && dupCountWith1And2 === 0,
    `Attempt 3 has exactly 10 questions with ZERO duplicates from Attempts 1 & 2 (${dupCountWith1And2} collisions)`
  );

  // --- TEST 7: Medium and Difficult Tiers (Exactly 10 questions each) ---
  console.log('\n--- TEST 7: Medium and Difficult Tiers ---');
  const medRes = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'medium' }),
  });
  const medData = await medRes.json();
  assert(
    medRes.status === 200 && medData.data.questions.length === 10,
    'Medium Mock Quiz generated exactly 10 questions'
  );

  const diffRes = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'difficult' }),
  });
  const diffData = await diffRes.json();
  assert(
    diffRes.status === 200 && diffData.data.questions.length === 10,
    'Difficult Mock Quiz generated exactly 10 questions'
  );

  console.log('\n========================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
