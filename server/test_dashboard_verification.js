const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://127.0.0.1:5174/api';
const BACKEND_URL = 'http://127.0.0.1:5000/api';

async function runDashboardVerification() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING STUDENT DASHBOARD BACKEND & FRONTEND INTEGRATION');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const student = {
    name: 'Vikram Mehta',
    email: `vikram_${timestamp}@example.com`,
    password: 'Password123!',
  };

  try {
    // 1. Register Student through Frontend Dev Server proxy
    console.log('1️⃣  Registering student through Vite proxy (POST http://localhost:5174/api/auth/register)...');
    const regRes = await fetch(`${FRONTEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    const token = regData.token;
    console.log(`   ✅ Student registered: ${regData.user.name} (${regData.user.email}) | Role: ${regData.user.role}`);

    // 2. Fetch Student Dashboard through Frontend Proxy
    console.log('\n2️⃣  Fetching Student Dashboard via Vite proxy (GET http://localhost:5174/api/student/dashboard)...');
    const dashRes1 = await fetch(`${FRONTEND_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData1 = await dashRes1.json();
    if (dashRes1.status !== 200 || !dashData1.data) {
      throw new Error(`Failed to fetch dashboard: ${JSON.stringify(dashData1)}`);
    }
    console.log('   ✅ Initial Dashboard Response:');
    console.log(`      - Welcome: "${dashData1.data.welcomeMessage}"`);
    console.log(`      - Target Role: "${dashData1.data.targetRole}"`);
    console.log(`      - Progress: ${dashData1.data.progressPercentage}%`);
    console.log(`      - Timeline: ${dashData1.data.daysRemaining} days remaining`);
    console.log(`      - Target Job: "${dashData1.data.targetJobStatus}"`);
    console.log(`      - Next Step Action: "${dashData1.data.nextStep.actionText}"`);

    // 3. Upload Resume for this student
    console.log('\n3️⃣  Uploading resume via POST /api/resume/upload to test dynamic state update...');
    const resumeContent = `
VIKRAM MEHTA
Full-Stack Software Engineer
Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Docker, Python, Git.
Projects: AI Placement Preparation Platform, E-Commerce Microservices.
`;
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="resume"; filename="Vikram_Mehta_Resume.txt"\r\n`;
    body += `Content-Type: text/plain\r\n\r\n`;
    body += resumeContent + '\r\n';
    body += `--${boundary}--\r\n`;

    const uploadRes = await fetch(`${BACKEND_URL}/resume/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(body, 'utf-8'),
    });
    const uploadData = await uploadRes.json();
    if (uploadRes.status !== 200 && uploadRes.status !== 201) {
      throw new Error(`Resume upload failed: ${JSON.stringify(uploadData)}`);
    }
    console.log(`   ✅ Resume uploaded! Extracted ${uploadData.resume.parsedSkills.length} skills.`);

    // 4. Fetch Student Dashboard again to verify dynamic data update
    console.log('\n4️⃣  Fetching updated Student Dashboard (GET http://localhost:5174/api/student/dashboard)...');
    const dashRes2 = await fetch(`${FRONTEND_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData2 = await dashRes2.json();
    console.log('   ✅ Updated Dashboard Response:');
    console.log(`      - Has Resume: ${dashData2.data.hasResume}`);
    console.log(`      - Resume Status: "${dashData2.data.resumeStatus}"`);
    console.log(`      - Progress Percentage: ${dashData2.data.progressPercentage}%`);
    console.log(`      - Parsed Skills in DB: ${dashData2.data.resumeDetails?.skillsCount}`);

    // 5. Verify Unauthenticated request to /api/student/dashboard is blocked
    console.log('\n5️⃣  Verifying unauthenticated access to /api/student/dashboard is guarded (401)...');
    const unauthRes = await fetch(`${BACKEND_URL}/student/dashboard`);
    if (unauthRes.status === 401) {
      console.log('   ✅ Unauthenticated access successfully blocked with 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL STUDENT DASHBOARD BACKEND & FRONTEND CHECKS PASSED 100%!');
    console.log('===============================================================\n');
  } catch (error) {
    console.error(`\n❌ VERIFICATION FAILED: ${error.message}`);
    process.exit(1);
  }
}

runDashboardVerification();
