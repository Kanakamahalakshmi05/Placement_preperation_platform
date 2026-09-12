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

async function runTest() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING PHASE 4: TARGET JOB & DRIVE DATE MANAGEMENT');
  console.log('===============================================================');

  // Step 1: Register student
  const email = `phase4_${Date.now()}@test.com`;
  console.log(`\n1️⃣  Registering student ${email}...`);
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Rohan Sharma', email, password: 'Password123!' }
  );

  if (regRes.status !== 201 || !regRes.data.token) {
    console.error('❌ Registration failed:', regRes);
    process.exit(1);
  }
  const token = regRes.data.token;
  console.log('   ✅ Registered student successfully with token.');

  // Step 2: Query target-job before adding
  console.log('\n2️⃣  Checking GET /api/target-job before any job is added...');
  const getBeforeRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/target-job',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Status: ${getBeforeRes.status}, data:`, getBeforeRes.data.data);
  if (getBeforeRes.status !== 200 || getBeforeRes.data.data !== null) {
    console.error('❌ Expected null target-job initially');
    process.exit(1);
  }
  console.log('   ✅ Returned null target job as expected.');

  // Step 3: Add Target Job
  console.log('\n3️⃣  Submitting POST /api/target-job with drive date 14 days ahead...');
  const driveDate = new Date();
  driveDate.setDate(driveDate.getDate() + 14);

  const sampleJD = `
    We are looking for a Software Development Engineer (SDE-1) at Google.
    Requirements:
    - Proficiency in React, Node.js, JavaScript, Python, and TypeScript.
    - Strong knowledge of Data Structures and Algorithms (DSA).
    - Experience with MongoDB, SQL, Docker, and REST APIs.
    - Good understanding of Git, CI/CD, and system design basics.
  `;

  const postRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/target-job',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      jobTitle: 'Software Development Engineer',
      company: 'Google',
      jobDescription: sampleJD,
      driveDate: driveDate.toISOString().split('T')[0],
    }
  );

  console.log(`   Status: ${postRes.status}, message: ${postRes.data.message}`);
  if (postRes.status !== 200 || !postRes.data.success) {
    console.error('❌ Failed to save target job:', postRes);
    process.exit(1);
  }
  const savedJob = postRes.data.data;
  console.log(`   ✅ Target Job Saved:`);
  console.log(`      - Title: ${savedJob.jobTitle} at ${savedJob.company}`);
  console.log(`      - Days Remaining: ${savedJob.daysRemaining}`);
  console.log(`      - Extracted Skills (${savedJob.extractedSkills.length}): ${savedJob.extractedSkills.join(', ')}`);

  if (!savedJob.extractedSkills.includes('React') || !savedJob.extractedSkills.includes('Node.js')) {
    console.error('❌ Skill extraction failed on JD');
    process.exit(1);
  }

  // Step 4: Verify Student Dashboard state reflects target job
  console.log('\n4️⃣  Checking GET /api/student/dashboard with target job added...');
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const dashData = dashRes.data.data;
  console.log('   ✅ Student Dashboard data:');
  console.log(`      - Target Role: "${dashData.targetRole}"`);
  console.log(`      - Company: "${dashData.company}"`);
  console.log(`      - Target Job Status: "${dashData.targetJobStatus}"`);
  console.log(`      - Days Remaining: ${dashData.daysRemaining}`);
  console.log(`      - Progress Percentage: ${dashData.progressPercentage}%`);

  if (dashData.targetJobStatus !== 'Added' || dashData.company !== 'Google') {
    console.error('❌ Dashboard does not reflect target job state properly');
    process.exit(1);
  }

  // Step 5: Test via Vite frontend proxy (http://localhost:5174/api/target-job)
  console.log('\n5️⃣  Verifying API endpoint works seamlessly via Vite proxy port 5174...');
  const viteRes = await request({
    hostname: 'localhost',
    port: 5174,
    path: '/api/target-job',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Vite Proxy Status: ${viteRes.status}`);
  if (viteRes.status !== 200 || viteRes.data.data.company !== 'Google') {
    console.error('❌ Vite proxy forwarding failed for target job');
    process.exit(1);
  }
  console.log('   ✅ Vite proxy forwarded target job successfully.');

  console.log('\n===============================================================');
  console.log('🎉 PHASE 4 TARGET JOB & DRIVE DATE VERIFICATION PASSED 100%!');
  console.log('===============================================================');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
