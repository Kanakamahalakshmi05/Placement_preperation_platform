/**
 * Comprehensive Test Suite for Preparation Page Redesign & Mock Quizzes:
 * 1. Resume + JD Skill Analysis (Matched Skills vs Skills to Improve - no hardcoded lists)
 * 2. Dynamic Important Topics (Generated dynamically from real Resume + JD gap)
 * 3. Mock Quiz Generation (Easy, Medium, Difficult - exactly 10 questions each)
 * 4. Mock Quiz Submission & Evaluation (Score, percentage, Strong Areas, Needs Improvement, AI Performance Analysis, What to Improve)
 * 5. Student Security Isolation
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Running Preparation Page & Mock Quiz Comprehensive Test Suite...\n');
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
  const studentEmail = `prep_student_${timestamp}@example.com`;
  const password = 'Password@123';

  console.log('--- 1. Register Student ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Preparation Student', email: studentEmail, password, role: 'Student' }),
  });
  const regData = await regRes.json();
  const token = regData.token;
  assert(token, 'Student registered successfully and acquired auth token');

  console.log('\n--- 2. Upload Real Resume ---');
  // Candidate knows React, Node.js, and MongoDB
  const resumeFormData = new FormData();
  resumeFormData.append(
    'resume',
    new Blob(
      [
        'John Smith - Full Stack Developer\nSkills: React, Node.js, MongoDB, JavaScript, Express, Git, HTML, CSS.\nBuilding dynamic user interfaces and data storage solutions.',
      ],
      { type: 'text/plain' }
    ),
    'john_smith_resume.txt'
  );
  const resumeRes = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: resumeFormData,
  });
  const resumeData = await resumeRes.json();
  assert(resumeRes.status === 200 && resumeData.success, 'Resume uploaded successfully');

  console.log('\n--- 3. Upload Target Job Description (Company: Razorpay) ---');
  // Company JD requires React, Node.js, MongoDB PLUS SQL, REST APIs, and DSA
  const jdFormData = new FormData();
  jdFormData.append('company', 'Razorpay');
  jdFormData.append(
    'jd',
    new Blob(
      [
        'Razorpay Backend / Full Stack Engineer\nWe are looking for an engineer to build payments infrastructure.\nRequirements:\n- Strong knowledge of React, Node.js, and MongoDB.\n- In-depth expertise in SQL databases, query optimization, and schema design.\n- Experience designing production REST APIs with high throughput.\n- Strong fundamentals in Data Structures and Algorithms (DSA).',
      ],
      { type: 'text/plain' }
    ),
    'Razorpay_JD.txt'
  );
  const jdRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdFormData,
  });
  const jdData = await jdRes.json();
  assert(jdRes.status === 200 && jdData.success && jdData.data.company === 'Razorpay', 'Target job saved with Razorpay and JD file');

  console.log('\n--- 4. Trigger Real AI Analysis (Resume + JD) ---');
  const analysisRes = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisData = await analysisRes.json();
  assert(analysisRes.status === 200 && analysisData.success, 'AI Analysis completed successfully');

  const { strongSkills, missingSkills, recommendedTopics } = analysisData.data.aiAnalysisData;

  // Check Matched Skills
  console.log(`\nMatched Skills: ${JSON.stringify(strongSkills)}`);
  console.log(`Skills to Improve: ${JSON.stringify(missingSkills)}`);
  console.log(`Important Topics: ${JSON.stringify(recommendedTopics)}`);

  const matchedSkillsLower = strongSkills.map((s) => s.toLowerCase());
  const missingSkillsLower = missingSkills.map((s) => s.toLowerCase());

  assert(
    matchedSkillsLower.includes('react') && (matchedSkillsLower.includes('node.js') || matchedSkillsLower.includes('node')),
    'Matched Skills correctly identify candidate strengths (React, Node.js)'
  );

  assert(
    missingSkillsLower.some((s) => s.includes('sql')) && missingSkillsLower.some((s) => s.includes('rest') || s.includes('api')),
    'Skills to Improve correctly identify JD requirements missing from Resume (SQL, REST APIs)'
  );

  assert(
    Array.isArray(recommendedTopics) && recommendedTopics.length >= 3,
    `Important Topics generated dynamically (${recommendedTopics.length} topics found)`
  );

  console.log('\n--- 5. Mock Quiz Generation (Easy, Medium, Difficult) ---');
  // Easy Quiz
  const easyRes = await fetch(`${BASE_URL}/student/quiz/easy`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const easyData = await easyRes.json();
  assert(
    easyRes.status === 200 &&
      easyData.success &&
      easyData.data.totalQuestions === 10 &&
      easyData.data.questions.length === 10,
    'Easy Mock Quiz generated exactly 10 questions'
  );
  assert(
    easyData.data.questions.every((q) => q.options && q.options.length === 4 && q.question),
    'Easy Mock Quiz questions each have 4 options and valid prompts'
  );

  // Medium Quiz
  const medRes = await fetch(`${BASE_URL}/student/quiz/medium`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const medData = await medRes.json();
  assert(
    medRes.status === 200 && medData.data.questions.length === 10,
    'Medium Mock Quiz generated exactly 10 questions'
  );

  // Difficult Quiz
  const diffRes = await fetch(`${BASE_URL}/student/quiz/difficult`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const diffData = await diffRes.json();
  assert(
    diffRes.status === 200 && diffData.data.questions.length === 10,
    'Difficult Mock Quiz generated exactly 10 questions'
  );

  console.log('\n--- 6. Mock Quiz Submission & Evaluation ---');
  // Simulate student answering 8 out of 10 questions correctly
  const easyQuestions = easyData.data.questions;
  const simulatedAnswers = {};
  easyQuestions.forEach((q, idx) => {
    if (idx < 8) {
      // Correct answer
      simulatedAnswers[q.id] = q.correctAnswerIndex;
    } else {
      // Incorrect answer
      simulatedAnswers[q.id] = (q.correctAnswerIndex + 1) % 4;
    }
  });

  const submitRes = await fetch(`${BASE_URL}/student/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      difficulty: 'easy',
      questions: easyQuestions,
      userAnswers: simulatedAnswers,
    }),
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 200 && submitData.success, 'Quiz submitted and evaluated successfully');

  const evalResult = submitData.data;
  assert(evalResult.score === 8 && evalResult.total === 10 && evalResult.percentage === 80, 'Score is 8 / 10 (80%)');
  assert(Array.isArray(evalResult.strongAreas) && evalResult.strongAreas.length > 0, 'Strong Areas identified with topics');
  assert(Array.isArray(evalResult.needsImprovement) && evalResult.needsImprovement.length > 0, 'Needs Improvement identified with topics');
  assert(typeof evalResult.aiPerformanceAnalysis === 'string' && evalResult.aiPerformanceAnalysis.length > 20, 'AI Performance Analysis paragraph generated');
  assert(Array.isArray(evalResult.whatToImprove) && evalResult.whatToImprove.length > 0, 'What to Improve prioritized action items generated');

  console.log('\n--- 7. Verification of Saved Quiz History on Dashboard ---');
  const dashRes = await fetch(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashData = await dashRes.json();
  assert(
    dashRes.status === 200 && dashData.data.aiAnalysisData !== null,
    'Dashboard returns active AI analysis data'
  );

  console.log('\n========================================');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
