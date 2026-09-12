const BASE_URL = 'http://127.0.0.1:5000/api';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 3: RESUME UPLOAD & PARSER VERIFICATION');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testUser = {
    name: 'Sita Sharma',
    email: `student_${timestamp}@example.com`,
    password: 'Password123!',
    role: 'Student', // Placement Candidate/Student role
  };

  try {
    // Step 1: Register and login student to acquire JWT
    console.log('1️⃣  Registering candidate to obtain JWT token...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.token) {
      throw new Error(`Candidate registration failed: ${JSON.stringify(regData)}`);
    }
    const token = regData.token;
    console.log(`   ✅ Candidate registered: ${testUser.email} (token received)`);

    // Step 2: Test upload without file
    console.log('\n2️⃣  Testing upload endpoint without file payload...');
    const emptyRes = await fetch(`${BASE_URL}/resume/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const emptyData = await emptyRes.json();
    if (emptyRes.status === 400) {
      console.log(`   ✅ Rejected empty upload: 400 Bad Request ("${emptyData.message}")`);
    } else {
      throw new Error(`Expected 400 for empty upload, got ${emptyRes.status}`);
    }

    // Step 3: Test upload with unauthenticated request
    console.log('\n3️⃣  Testing upload endpoint without authentication header...');
    const unauthRes = await fetch(`${BASE_URL}/resume/upload`, {
      method: 'POST',
    });
    const unauthData = await unauthRes.json();
    if (unauthRes.status === 401) {
      console.log(`   ✅ Rejected unauthenticated upload: 401 Unauthorized ("${unauthData.message}")`);
    } else {
      throw new Error(`Expected 401 for unauthenticated upload, got ${unauthRes.status}`);
    }

    // Step 4: Upload valid resume with technical content
    console.log('\n4️⃣  Uploading valid student resume (PDF/Text) with technical skills...');
    const sampleResumeText = `
SITA SHARMA
Full Stack Software Developer
Email: sita@example.com | Phone: +91 9876543210

PROFESSIONAL SUMMARY
Passionate software engineer skilled in Java, Python, JavaScript, and modern full-stack web development. Experienced in building scalable web applications using React, Node.js, Express, and MongoDB. Strong fundamentals in DSA, OOP, DBMS, and REST APIs.

TECHNICAL SKILLS
- Programming Languages: Java, Python, JavaScript, TypeScript, SQL, HTML5, CSS3
- Frontend Development: React, Redux, Tailwind CSS, Vite
- Backend & Frameworks: Node.js, Express, Spring Boot, REST APIs, WebSockets
- Databases: MongoDB, PostgreSQL, MySQL, Redis, Mongoose
- Tools & Cloud: Git, GitHub, Docker, AWS, Linux, Postman
- Core Fundamentals: DSA (Data Structures & Algorithms), OOP, Operating Systems, Computer Networks

PROJECTS
• AI-Powered Placement Preparation Platform
Full-stack preparation system with dynamic mock interviews, automated code assessment, and skill gap analysis using React, Node.js, Express, and MongoDB.

• Real-Time E-Commerce Dashboard
Interactive inventory tracking dashboard built with React, Redux, Tailwind CSS, and WebSockets for live inventory notifications.
    `;

    // Create multipart form-data using native FormData and Blob
    const formData = new FormData();
    const resumeBlob = new Blob([sampleResumeText], { type: 'text/plain' });
    formData.append('resume', resumeBlob, 'Sita_Sharma_Resume.txt');

    const uploadRes = await fetch(`${BASE_URL}/resume/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();

    if (uploadRes.status === 200 && uploadData.success && uploadData.resume) {
      console.log(`   ✅ Resume uploaded and parsed successfully!`);
      console.log(`   📄 File Name: ${uploadData.resume.fileName} (${uploadData.resume.fileSize} bytes)`);
      console.log(`   💡 Parsed Skills count: ${uploadData.resume.parsedSkills.length}`);
      console.log(`   🎯 Skills detected: [${uploadData.resume.parsedSkills.slice(0, 10).join(', ')}, ...]`);
      console.log(`   🛠️  Projects detected: ${uploadData.resume.parsedProjects.length}`);
    } else {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }

    // Step 5: Test GET /api/resume/me to verify persistence in MongoDB Atlas
    console.log('\n5️⃣  Testing GET /api/resume/me to verify persistence in MongoDB Atlas...');
    const getRes = await fetch(`${BASE_URL}/resume/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData = await getRes.json();

    if (getRes.status === 200 && getData.success && getData.resume) {
      console.log(`   ✅ Retrieved persistent resume from MongoDB Atlas:`);
      console.log(`      ID: ${getData.resume.id}`);
      console.log(`      Total Skills in DB: ${getData.resume.parsedSkills.length}`);
      console.log(`      First 5 Skills: ${JSON.stringify(getData.resume.parsedSkills.slice(0, 5))}`);
    } else {
      throw new Error(`Failed to retrieve resume: ${JSON.stringify(getData)}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 3 RESUME UPLOAD & PARSING TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PHASE 3 TEST FAILED:', error.message);
    process.exit(1);
  }
};

runTests();
