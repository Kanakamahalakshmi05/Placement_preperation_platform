const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function uploadMultipartResume(token, filename = 'resume.txt', content = 'Skills: React, Node.js, JavaScript, Python, MongoDB. Projects: Full stack web app') {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="resume"; filename="${filename}"\r\n`;
    payload += `Content-Type: text/plain\r\n\r\n`;
    payload += content;
    payload += `\r\n--${boundary}--\r\n`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/resume/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verifyAllStates() {
  console.log('===============================================================');
  console.log('🧪 TESTING ALL 6 STUDENT DASHBOARD STATES & STAGE GATES');
  console.log('===============================================================');

  // Register a new test student
  const email = `stateflow_${Date.now()}@test.com`;
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Aditya Rao', email, password: 'Password123!' }
  );
  const token = regRes.data.token;
  console.log(`\nCreated test student: ${email}`);

  // -------------------------------------------------------------------------
  // STATE 1: No Resume
  // -------------------------------------------------------------------------
  console.log('\n--- 1️⃣  TESTING STATE 1: NO RESUME ---');
  let dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Resume Status: "${dash.resumeStatus}"`);
  console.log(`   Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   Can Access Target Job: ${dash.canAccessTargetJob}`);

  if (dash.stage !== 1 || dash.resumeStatus !== 'Not added' || dash.canAccessTargetJob !== false) {
    throw new Error('State 1 validation failed!');
  }

  // Attempt to skip to Target Job without resume (Must be rejected)
  console.log('   🔒 Verifying stage-gate: POST /api/target-job blocked without resume...');
  const blockedTJ = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/target-job',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      jobTitle: 'SDE-1',
      company: 'Google',
      jobDescription: 'Looking for React and Node.js developer with DSA skills.',
      driveDate: '2026-10-01',
    }
  );
  console.log(`   Blocked Status: ${blockedTJ.status}, Message: "${blockedTJ.data.message}"`);
  if (blockedTJ.status !== 400) {
    throw new Error('Stage gate failed: Target Job was allowed without resume!');
  }
  console.log('   ✅ State 1 Verified: Target job blocked until resume is uploaded.');

  // -------------------------------------------------------------------------
  // STATE 2: Resume Uploaded, Target Job Missing
  // -------------------------------------------------------------------------
  console.log('\n--- 2️⃣  TESTING STATE 2: RESUME UPLOADED, TARGET JOB MISSING ---');
  const uploadRes = await uploadMultipartResume(token);
  console.log(`   Upload Status: ${uploadRes.status}`);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Resume Status: "${dash.resumeStatus}"`);
  console.log(`   Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   Can Access Target Job: ${dash.canAccessTargetJob}`);
  console.log(`   Can Access Analysis: ${dash.canAccessAnalysis}`);

  if (dash.stage !== 2 || dash.resumeStatus !== 'Uploaded' || dash.targetJobStatus !== 'Not added' || dash.nextStep.actionText !== 'Add Target Job') {
    throw new Error('State 2 validation failed!');
  }

  // Attempt to skip to AI Analysis without target job (Must be rejected)
  console.log('   🔒 Verifying stage-gate: Trigger analysis blocked without target job...');
  const blockedAnalysis = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/trigger-analysis',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Blocked Status: ${blockedAnalysis.status}, Message: "${blockedAnalysis.data.message}"`);
  if (blockedAnalysis.status !== 400) {
    throw new Error('Stage gate failed: Analysis was allowed without target job!');
  }
  console.log('   ✅ State 2 Verified: Resume uploaded, Target Job required next.');

  // -------------------------------------------------------------------------
  // STATE 3: Resume + Target Job Available, AI Analysis Not Run
  // -------------------------------------------------------------------------
  console.log('\n--- 3️⃣  TESTING STATE 3: RESUME + TARGET JOB READY ---');
  const addTJRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/target-job',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      jobTitle: 'Full Stack AI Engineer',
      company: 'OpenAI',
      jobDescription: 'Requires React, Node.js, Python, TypeScript, Docker, and DSA.',
      driveDate: '2026-10-15',
    }
  );
  console.log(`   Target Job Saved: ${addTJRes.status}`);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Resume Status: "${dash.resumeStatus}"`);
  console.log(`   Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   Next Step Description: "${dash.nextStep.description}"`);
  console.log(`   Can Access Analysis: ${dash.canAccessAnalysis}`);

  if (dash.stage !== 3 || dash.resumeStatus !== 'Uploaded' || dash.targetJobStatus !== 'Added' || dash.nextStep.actionText !== 'Start AI Analysis') {
    throw new Error('State 3 validation failed!');
  }
  console.log('   ✅ State 3 Verified: Ready for AI analysis.');

  // -------------------------------------------------------------------------
  // STATE 4: AI Analysis Completed
  // -------------------------------------------------------------------------
  console.log('\n--- 4️⃣  TESTING STATE 4: AI ANALYSIS COMPLETED ---');
  const runAnalysisRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/trigger-analysis',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Trigger Analysis Status: ${runAnalysisRes.status}`);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   Strong Skills: ${dash.aiAnalysisData.strongSkills.join(', ')}`);
  console.log(`   Missing Skills: ${dash.aiAnalysisData.missingSkills.join(', ')}`);

  if (dash.stage !== 4 || dash.nextStep.actionText !== 'View Recommendations') {
    throw new Error('State 4 validation failed!');
  }
  console.log('   ✅ State 4 Verified: Recommendations ready for review.');

  // -------------------------------------------------------------------------
  // STATE 5: Student is Preparing
  // -------------------------------------------------------------------------
  console.log('\n--- 5️⃣  TESTING STATE 5: STUDENT IS PREPARING ---');
  const prepRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/start-preparing',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Start Preparing Status: ${prepRes.status}`);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);

  if (dash.stage !== 5 || dash.nextStep.actionText !== 'Continue Prep') {
    throw new Error('State 5 validation failed!');
  }
  console.log('   ✅ State 5 Verified: Student in preparation mode.');

  // -------------------------------------------------------------------------
  // STATE 6: Student Has Indicated Readiness (I'M READY)
  // -------------------------------------------------------------------------
  console.log('\n--- 6️⃣  TESTING STATE 6: READINESS CONFIRMED (START ROUND 1) ---');
  const readyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/ready-for-round1',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Readiness Status: ${readyRes.status}`);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   Stage: ${dash.stage}`);
  console.log(`   Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   Can Access Assessment: ${dash.canAccessAssessment}`);

  if (dash.stage !== 6 || dash.nextStep.actionText !== 'Start Round 1' || dash.canAccessAssessment !== true) {
    throw new Error('State 6 validation failed!');
  }
  console.log('   ✅ State 6 Verified: Round 1 Technical Assessment unlocked.');

  console.log('\n===============================================================');
  console.log('🎉 ALL 6 DASHBOARD STATES & STAGE GATES PASSED 100%!');
  console.log('===============================================================');
}

verifyAllStates().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
