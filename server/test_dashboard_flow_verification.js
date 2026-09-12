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

function uploadMultipartResume(port, token, filename = 'resume.txt') {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="resume"; filename="${filename}"\r\n`;
    payload += `Content-Type: text/plain\r\n\r\n`;
    payload += `Candidate: Sneha Patel\r\nSkills: React, Node.js, Express, JavaScript, Python, MongoDB, SQL, Git.\r\nProjects: AI Placement System, Full Stack Dashboard.`;
    payload += `\r\n--${boundary}--\r\n`;

    const req = http.request(
      {
        hostname: 'localhost',
        port,
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

async function verifyFullFlow() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING REVISED STUDENT DASHBOARD FLOW & 6 STATES');
  console.log('===============================================================');

  // Register via Vite Proxy
  const email = `flow_test_${Date.now()}@test.com`;
  console.log(`\n1️⃣  Registering student via Vite Proxy (http://localhost:5174/api/auth/register)...`);
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5174,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Sneha Patel', email, password: 'Password123!' }
  );

  if (regRes.status !== 201 || !regRes.data.token) {
    console.error('❌ Registration failed:', regRes);
    process.exit(1);
  }
  const token = regRes.data.token;
  console.log(`   ✅ Registered student: ${email}`);

  // -------------------------------------------------------------------------
  // STATE 1: No Resume
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 1: NO RESUME ---');
  let dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Resume Status: "${dash.resumeStatus}"`);
  console.log(`   • Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   • Can Access Target Job: ${dash.canAccessTargetJob}`);

  if (dash.stage !== 1 || dash.resumeStatus !== 'Not added' || dash.nextStep.actionText !== 'Upload Resume' || dash.canAccessTargetJob !== false) {
    console.error('❌ State 1 mismatch:', dash);
    process.exit(1);
  }

  // Verify Target Job is blocked in State 1
  const blockTJ = await request(
    {
      hostname: 'localhost',
      port: 5174,
      path: '/api/target-job',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    { jobTitle: 'SDE-1', company: 'Google', jobDescription: 'Need React and Node.js developer with DSA.', driveDate: '2026-10-01' }
  );
  if (blockTJ.status !== 400) {
    console.error('❌ Target Job was not blocked without resume!');
    process.exit(1);
  }
  console.log('   ✅ State 1 Verified: Target Job blocked before resume upload.');

  // -------------------------------------------------------------------------
  // STATE 2: Resume Uploaded, Target Job Missing
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 2: RESUME UPLOADED, TARGET JOB MISSING ---');
  const uploadRes = await uploadMultipartResume(5174, token);
  console.log(`   Resume uploaded (Status: ${uploadRes.status})`);

  dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Resume Status: "${dash.resumeStatus}"`);
  console.log(`   • Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   • Can Access Target Job: ${dash.canAccessTargetJob}`);
  console.log(`   • Can Access Analysis: ${dash.canAccessAnalysis}`);

  if (dash.stage !== 2 || dash.resumeStatus !== 'Uploaded' || dash.targetJobStatus !== 'Not added' || dash.nextStep.actionText !== 'Add Target Job') {
    console.error('❌ State 2 mismatch:', dash);
    process.exit(1);
  }
  console.log('   ✅ State 2 Verified: Resume uploaded, Target Job unlocked.');

  // -------------------------------------------------------------------------
  // STATE 3: Resume + Target Job Ready
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 3: RESUME + TARGET JOB AVAILABLE, ANALYSIS NOT RUN ---');
  const addTJ = await request(
    {
      hostname: 'localhost',
      port: 5174,
      path: '/api/target-job',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      jobTitle: 'Full Stack AI Engineer',
      company: 'TechCorp Innovations',
      jobDescription: 'Looking for Full Stack AI Engineer with React, Node.js, Python, TypeScript, Docker, and DSA.',
      driveDate: '2026-10-20',
    }
  );
  if (addTJ.status !== 200) {
    console.error('❌ Failed to add target job:', addTJ);
    process.exit(1);
  }

  dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Resume Status: "${dash.resumeStatus}"`);
  console.log(`   • Target Job Status: "${dash.targetJobStatus}"`);
  console.log(`   • Target Role: "${dash.targetRole}"`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   • Description: "${dash.nextStep.description}"`);

  if (
    dash.stage !== 3 ||
    dash.resumeStatus !== 'Uploaded' ||
    dash.targetJobStatus !== 'Added' ||
    dash.nextStep.actionText !== 'Start AI Analysis' ||
    !dash.nextStep.description.includes('Your resume and target job are ready')
  ) {
    console.error('❌ State 3 mismatch:', dash);
    process.exit(1);
  }
  console.log('   ✅ State 3 Verified: [Start AI Analysis] unlocked.');

  // -------------------------------------------------------------------------
  // STATE 4: AI Analysis Completed
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 4: AI ANALYSIS COMPLETED ---');
  const analysisRes = await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/trigger-analysis',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (analysisRes.status !== 200) {
    console.error('❌ AI analysis trigger failed:', analysisRes);
    process.exit(1);
  }

  dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   • Strong Skills: ${dash.aiAnalysisData.strongSkills.join(', ')}`);
  console.log(`   • Missing Skills: ${dash.aiAnalysisData.missingSkills.join(', ')}`);
  console.log(`   • Recommended Topics: ${dash.aiAnalysisData.recommendedTopics.join(', ')}`);

  if (dash.stage !== 4 || dash.nextStep.actionText !== 'View Recommendations') {
    console.error('❌ State 4 mismatch:', dash);
    process.exit(1);
  }
  console.log('   ✅ State 4 Verified: Recommendations available for review.');

  // -------------------------------------------------------------------------
  // STATE 5: Student is Preparing
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 5: STUDENT IS PREPARING ---');
  const prepRes = await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/start-preparing',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (prepRes.status !== 200) {
    console.error('❌ start-preparing failed:', prepRes);
    process.exit(1);
  }

  dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);

  if (dash.stage !== 5 || dash.nextStep.actionText !== 'Continue Prep') {
    console.error('❌ State 5 mismatch:', dash);
    process.exit(1);
  }
  console.log('   ✅ State 5 Verified: Student in independent preparation.');

  // -------------------------------------------------------------------------
  // STATE 6: Readiness Indicated (I'M READY)
  // -------------------------------------------------------------------------
  console.log('\n--- 🔹 STATE 6: READINESS CONFIRMED (I\'M READY -> START ROUND 1) ---');
  const readyRes = await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/ready-for-round1',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (readyRes.status !== 200) {
    console.error('❌ ready-for-round1 failed:', readyRes);
    process.exit(1);
  }

  dash = (await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;

  console.log(`   • Stage: ${dash.stage}`);
  console.log(`   • Next Step Message: "${dash.nextStep.message}"`);
  console.log(`   • Next Step Action: "${dash.nextStep.actionText}"`);
  console.log(`   • Can Access Assessment: ${dash.canAccessAssessment}`);

  if (dash.stage !== 6 || dash.nextStep.actionText !== 'Start Round 1' || dash.canAccessAssessment !== true) {
    console.error('❌ State 6 mismatch:', dash);
    process.exit(1);
  }
  console.log('   ✅ State 6 Verified: Round 1 Technical Assessment unlocked.');

  console.log('\n===============================================================');
  console.log('🎉 ALL 6 DASHBOARD STATES & STAGE GATES VERIFIED 100% SUCCESS!');
  console.log('===============================================================');
}

verifyFullFlow().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
