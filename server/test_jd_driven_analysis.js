const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function runComprehensiveJdSuite() {
  console.log('🚀 Starting JD-Driven Resume Analysis & Quiz Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  const testAssert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  const studentEmail = `jd_test_${Date.now()}@example.com`;
  const studentPassword = 'Password123!';
  let token = '';

  // Setup: Register Student
  console.log('--- Setup: Register Student ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'JD Analysis Test Candidate',
      email: studentEmail,
      password: studentPassword,
      role: 'Student',
    }),
  });
  const regData = await regRes.json();
  token = regData.token;
  testAssert(token, 'Student registered successfully');

  // Candidate's Resume Text
  // Note: Resume has projects in React, Node.js, Python, and Machine Learning.
  // Resume only mentions SQL in keywords list.
  // Resume has NO Docker, MongoDB, TypeScript, Pandas, NumPy, Model Evaluation.
  const sampleResumeText = `
ALEX RIVERA
Software Engineer | Full Stack & Data Enthusiast

SUMMARY
Enthusiastic software engineer with extensive experience building production web applications and data solutions.

EXPERIENCE & PROJECTS
Frontend Project:
- Developed responsive interactive web applications using React and CSS for high-volume consumer traffic.
- Built reusable modular user interfaces and state management pipelines with React and JavaScript.

Backend Project:
- Engineered scalable microservice backends using Node.js and Express.
- Designed and implemented secure REST APIs for payment gateway and client management.

Data Science Project:
- Implemented machine learning models using Python to classify customer behavior patterns.
- Trained predictive random forest algorithms in Python achieving 91% precision.

TECHNICAL SKILLS
Languages & Frameworks: React, Node.js, Python, JavaScript, HTML/CSS
Tools & Databases: SQL, Git, Linux
Interests: Interested in Distributed Systems and Cloud Computing
`;

  // Upload Resume
  console.log('\n--- Upload Candidate Resume ---');
  const resumeFormData = new FormData();
  resumeFormData.append(
    'resume',
    new Blob([sampleResumeText], { type: 'text/plain' }),
    'Alex_Rivera_Resume.txt'
  );

  const resumeRes = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: resumeFormData,
  });
  const resumeData = await resumeRes.json();
  if (!resumeData.success) {
    console.log('  [DEBUG resume upload failed]:', resumeRes.status, resumeData);
  }
  testAssert(resumeRes.status === 200 && resumeData.success, 'Candidate Resume uploaded successfully');

  // =========================================================================
  // TEST 1: FULL STACK JD (React, Node.js, REST APIs, SQL, MongoDB, Docker)
  // =========================================================================
  console.log('\n--- TEST 1: Full Stack Job Description ---');
  const jdTextA = `
COMPANY: FinTech Core Solutions
ROLE: Full Stack Software Engineer
OVERVIEW:
FinTech Core is hiring a Full Stack Engineer to build reliable financial transaction platforms.

CORE REQUIREMENTS (MUST HAVE):
- React: Strong experience building modern single-page applications with React.
- Node.js & REST APIs: Proven track record designing and developing performant REST APIs using Node.js.
- SQL: Experience writing complex SQL queries, joins, and indexing relational databases.
- MongoDB: Working knowledge of document data modeling in MongoDB.
- Docker: Containerization and Docker multi-stage workflow in continuous delivery.
`;

  const jdAFormData = new FormData();
  jdAFormData.append('company', 'FinTech Core Solutions');
  jdAFormData.append(
    'jd',
    new Blob([jdTextA], { type: 'text/plain' }),
    'FullStack_JD.txt'
  );

  const jdA_Res = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdAFormData,
  });
  const jdA_Data = await jdA_Res.json();
  if (!jdA_Data.success) {
    console.log('  [DEBUG jdA save failed]:', jdA_Res.status, jdA_Data);
  }
  testAssert(jdA_Res.status === 200 && jdA_Data.success, 'Full Stack JD (FinTech Core) saved');

  // Trigger AI Analysis for Full Stack JD
  const analysisResA = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisDataA = await analysisResA.json();
  const matchedA = analysisDataA.data.matchedSkills || [];
  const improveA = analysisDataA.data.skillsToImprove || [];
  const topicsA = analysisDataA.data.importantTopics || [];

  console.log('  Matched Skills (Full Stack):', matchedA);
  console.log('  Skills to Improve (Full Stack):', improveA);
  console.log('  Important Topics (Full Stack):', topicsA);

  testAssert(
    matchedA.includes('React') && matchedA.includes('Node.js'),
    'Matched skills contains confirmed JD requirements (React, Node.js)'
  );
  testAssert(
    !matchedA.includes('Python') && !matchedA.includes('Machine Learning'),
    'CRITICAL: Python & Machine Learning are NOT in matched skills because Full Stack JD does not require them'
  );
  testAssert(
    improveA.includes('SQL') || improveA.includes('MongoDB') || improveA.includes('Docker'),
    'Skills to improve correctly captures missing/partial JD requirements (SQL, MongoDB, Docker)'
  );
  testAssert(
    topicsA.some((t) => /sql|rest|node|react|docker|mongo/i.test(t)),
    'Important topics are derived directly from Full Stack JD requirements'
  );

  // Generate Quiz for Full Stack JD
  const quizResA = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quizDataA = await quizResA.json();
  const questionsA = quizDataA.data.questions || [];

  testAssert(questionsA.length === 10, 'Full Stack Quiz generated exactly 10 questions');

  // Verify quiz questions strictly match Full Stack topics and have ZERO ML questions
  let fullStackQuestionCount = 0;
  let mlQuestionCount = 0;
  questionsA.forEach((q) => {
    const text = (q.question + ' ' + (q.topic || '')).toLowerCase();
    if (/react|node|sql|rest|docker|mongo|javascript/i.test(text)) fullStackQuestionCount++;
    if (/machine learning|pandas|numpy|model evaluation/i.test(text)) mlQuestionCount++;
  });

  testAssert(
    fullStackQuestionCount >= 8 && mlQuestionCount === 0,
    `Quiz questions are Full Stack driven (${fullStackQuestionCount}/10 matched) with ZERO ML questions`
  );

  // =========================================================================
  // TEST 2: MACHINE LEARNING JD (Python, Machine Learning, Pandas, NumPy, Model Evaluation)
  // (SAME RESUME, REPLACED JD)
  // =========================================================================
  console.log('\n--- TEST 2: Machine Learning Job Description (Same Resume, Replaced JD) ---');
  const jdTextB = `
COMPANY: DeepInsight AI Labs
ROLE: Machine Learning Engineer
OVERVIEW:
DeepInsight AI is seeking a Machine Learning Engineer to build predictive data models.

REQUIRED QUALIFICATIONS:
- Python: Strong proficiency in Python object-oriented programming.
- Machine Learning: Hands-on experience training supervised machine learning algorithms.
- Pandas: Data manipulation and data cleaning with Pandas DataFrames.
- NumPy: High performance mathematical operations and broadcasting with NumPy arrays.
- Model Evaluation: Thorough understanding of evaluation metrics (ROC-AUC, Precision, Recall, F1-Score).
`;

  const jdBFormData = new FormData();
  jdBFormData.append('company', 'DeepInsight AI Labs');
  jdBFormData.append(
    'jd',
    new Blob([jdTextB], { type: 'text/plain' }),
    'ML_JD.txt'
  );

  const jdB_Res = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdBFormData,
  });
  const jdB_Data = await jdB_Res.json();
  testAssert(jdB_Res.status === 200 && jdB_Data.success, 'Machine Learning JD (DeepInsight AI) saved');

  // Verify dashboard invalidates analysis upon JD replacement
  const dashResB = await fetch(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashDataB = await dashResB.json();
  testAssert(
    dashDataB.data.aiAnalysisCompleted === false,
    'Stale analysis invalidated immediately upon JD replacement'
  );

  // Trigger AI Analysis for ML JD
  const analysisResB = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisDataB = await analysisResB.json();
  const matchedB = analysisDataB.data.matchedSkills || [];
  const improveB = analysisDataB.data.skillsToImprove || [];
  const topicsB = analysisDataB.data.importantTopics || [];

  console.log('  New Matched Skills (ML):', matchedB);
  console.log('  New Skills to Improve (ML):', improveB);
  console.log('  New Important Topics (ML):', topicsB);

  testAssert(
    matchedB.includes('Python') && matchedB.includes('Machine Learning'),
    'Matched skills dynamically shifted to ML requirements (Python, Machine Learning)'
  );
  testAssert(
    !matchedB.includes('React') && !matchedB.includes('Node.js'),
    'CRITICAL: React & Node.js disappear from Matched Skills because ML JD does not require them'
  );
  testAssert(
    improveB.includes('Pandas') || improveB.includes('NumPy') || improveB.includes('Model Evaluation'),
    'Skills to improve correctly captures missing ML requirements (Pandas, NumPy, Model Evaluation)'
  );
  testAssert(
    topicsB.some((t) => /pandas|numpy|model evaluation|machine learning|python/i.test(t)),
    'Important topics dynamically shifted to Machine Learning competencies'
  );

  // Generate Quiz for ML JD
  const quizResB = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quizDataB = await quizResB.json();
  const questionsB = quizDataB.data.questions || [];

  testAssert(questionsB.length === 10, 'Machine Learning Quiz generated exactly 10 questions');

  let mlCountInQuizB = 0;
  let webCountInQuizB = 0;
  questionsB.forEach((q) => {
    const text = (q.question + ' ' + (q.topic || '')).toLowerCase();
    if (/python|machine learning|pandas|numpy|model evaluation/i.test(text)) mlCountInQuizB++;
    if (/react|node\.js|html|css|express/i.test(text)) webCountInQuizB++;
  });

  testAssert(
    mlCountInQuizB >= 8 && webCountInQuizB === 0,
    `Quiz dynamically transformed into Machine Learning questions (${mlCountInQuizB}/10 matched) with ZERO web frontend questions`
  );

  // =========================================================================
  // TEST 3: FRONTEND JD (React, JavaScript, HTML/CSS, TypeScript)
  // (SAME RESUME, REPLACED JD AGAIN)
  // =========================================================================
  console.log('\n--- TEST 3: Frontend Job Description (Same Resume, Replaced JD) ---');
  const jdTextC = `
COMPANY: PixelCraft UI Studio
ROLE: Frontend Web Developer
OVERVIEW:
PixelCraft is looking for a Frontend Web Developer to craft responsive interfaces.

REQUIREMENTS:
- React: Expertise in functional components, hooks, and virtual DOM.
- JavaScript: Strong core JavaScript ES6+ fundamentals.
- HTML/CSS: Deep understanding of semantic HTML and modern CSS flexbox/grid.
- TypeScript: Type-safe application development using interfaces and generics.
`;

  const jdCFormData = new FormData();
  jdCFormData.append('company', 'PixelCraft UI Studio');
  jdCFormData.append(
    'jd',
    new Blob([jdTextC], { type: 'text/plain' }),
    'Frontend_JD.txt'
  );

  const jdC_Res = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: jdCFormData,
  });
  const jdC_Data = await jdC_Res.json();
  testAssert(jdC_Res.status === 200 && jdC_Data.success, 'Frontend JD (PixelCraft) saved');

  const analysisResC = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const analysisDataC = await analysisResC.json();
  const matchedC = analysisDataC.data.matchedSkills || [];
  const improveC = analysisDataC.data.skillsToImprove || [];
  const topicsC = analysisDataC.data.importantTopics || [];

  console.log('  New Matched Skills (Frontend):', matchedC);
  console.log('  New Skills to Improve (Frontend):', improveC);
  console.log('  New Important Topics (Frontend):', topicsC);

  testAssert(
    matchedC.includes('React') && (matchedC.includes('JavaScript') || matchedC.includes('HTML/CSS')),
    'Matched skills correctly reflect Frontend JD requirements'
  );
  testAssert(
    !matchedC.includes('Python') && !matchedC.includes('Machine Learning') && !matchedC.includes('Node.js'),
    'CRITICAL: Python, ML, and Node.js are strictly EXCLUDED from Matched Skills for Frontend JD'
  );
  testAssert(
    improveC.includes('TypeScript'),
    'Skills to improve correctly captures missing Frontend requirement (TypeScript)'
  );

  // Generate Quiz for Frontend JD
  const quizResC = await fetch(`${BASE_URL}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ difficulty: 'easy' }),
  });
  const quizDataC = await quizResC.json();
  const questionsC = quizDataC.data.questions || [];

  testAssert(questionsC.length === 10, 'Frontend Quiz generated exactly 10 questions');

  let feCountInQuizC = 0;
  let backendCountInQuizC = 0;
  questionsC.forEach((q) => {
    const text = (q.question + ' ' + (q.topic || '')).toLowerCase();
    if (/react|javascript|html|css|typescript/i.test(text)) feCountInQuizC++;
    if (/python|machine learning|docker|kubernetes|pandas/i.test(text)) backendCountInQuizC++;
  });

  testAssert(
    feCountInQuizC >= 8 && backendCountInQuizC === 0,
    `Frontend Quiz is 100% frontend-focused (${feCountInQuizC}/10 matched) with ZERO ML or Backend questions`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveJdSuite();
