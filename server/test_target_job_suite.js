/**
 * Comprehensive Test Suite for Target Job Page UI & API Requirements:
 * 1. Company name validation (missing / too short)
 * 2. JD upload (missing file validation)
 * 3. Invalid file type (.exe or unsupported extension)
 * 4. File size validation (> 5MB limit)
 * 5. Save target job (Company Name + JD file)
 * 6. Retrieve target job (GET /api/target-job returns company + jdFileName, raw JD stored)
 * 7. Replace JD (Update with new company/JD)
 * 8. Student ownership/security (Private student route, student B cannot access student A's job target)
 * 9. Continue to AI Analysis only after both Resume + JD exist (Access Rule)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Running Target Job Comprehensive Verification Suite...\n');
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

  // 1. Setup Student A and Student B
  const timestamp = Date.now();
  const studentAEmail = `tj_student_a_${timestamp}@example.com`;
  const studentBEmail = `tj_student_b_${timestamp}@example.com`;
  const password = 'Password@123';

  console.log('--- Setting Up Test Students ---');
  // Register Student A
  const regARes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Student A', email: studentAEmail, password, role: 'Student' }),
  });
  const regAData = await regARes.json();
  const tokenA = regAData.token;
  assert(tokenA, 'Student A registered and obtained token');

  // Register Student B
  const regBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Student B', email: studentBEmail, password, role: 'Student' }),
  });
  const regBData = await regBRes.json();
  const tokenB = regBData.token;
  assert(tokenB, 'Student B registered and obtained token');

  // TEST 9A: Access Rule - Cannot add Target Job before Resume uploaded
  console.log('\n--- Test: Sequential Access Rule (Gating) ---');
  const gateFormData = new FormData();
  gateFormData.append('company', 'Google LLC');
  gateFormData.append(
    'jd',
    new Blob(['We are looking for a Software Engineer with Python and React skills.'], { type: 'text/plain' }),
    'job_desc.txt'
  );
  const gateRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: gateFormData,
  });
  const gateData = await gateRes.json();
  assert(
    gateRes.status === 400 && gateData.message.includes('Resume must be uploaded first'),
    'Target Job requires Resume uploaded first (Status: 400)'
  );

  // Now upload Resume for Student A
  const resumeFormData = new FormData();
  resumeFormData.append(
    'resume',
    new Blob(
      [
        'John Doe - Software Developer\nExperience: React, Node.js, Express, MongoDB, Python, DSA, Git, AWS Cloud.',
      ],
      { type: 'text/plain' }
    ),
    'john_doe_resume.txt'
  );
  const resumeRes = await fetch(`${BASE_URL}/resume/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: resumeFormData,
  });
  const resumeData = await resumeRes.json();
  assert(resumeRes.status === 200 && resumeData.success, 'Resume uploaded successfully for Student A');

  // TEST 1: Company name validation
  console.log('\n--- Test 1: Company Name Validation ---');
  const noCompanyFormData = new FormData();
  noCompanyFormData.append('company', ' ');
  noCompanyFormData.append(
    'jd',
    new Blob(['Software Engineer requirements: React, JavaScript, Node.js, SQL database, System Design.'], {
      type: 'text/plain',
    }),
    'job_description.txt'
  );
  const noCompRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: noCompanyFormData,
  });
  const noCompData = await noCompRes.json();
  assert(
    noCompRes.status === 400 && noCompData.message.includes('Company name is required'),
    'Reject empty company name with 400 validation error'
  );

  // TEST 2: Missing JD file validation
  console.log('\n--- Test 2: Missing JD File Validation ---');
  const noFileFormData = new FormData();
  noFileFormData.append('company', 'Microsoft');
  const noFileRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: noFileFormData,
  });
  const noFileData = await noFileRes.json();
  assert(
    noFileRes.status === 400 && noFileData.message.includes('Please upload a company job description file'),
    'Reject missing JD file with 400 error'
  );

  // TEST 3: Invalid file type (.exe)
  console.log('\n--- Test 3: Invalid File Type Validation ---');
  const invalidExtFormData = new FormData();
  invalidExtFormData.append('company', 'Amazon');
  invalidExtFormData.append(
    'jd',
    new Blob(['Binary executable content simulation'], { type: 'application/octet-stream' }),
    'job_description.exe'
  );
  const invalidExtRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: invalidExtFormData,
  });
  const invalidExtData = await invalidExtRes.json();
  assert(
    invalidExtRes.status === 400 && invalidExtData.message.includes('Invalid file format'),
    'Reject unsupported file extension (.exe) with 400 error'
  );

  // TEST 4: File size validation (> 5MB)
  console.log('\n--- Test 4: File Size Validation (> 5MB) ---');
  const largeBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
  const largeFormData = new FormData();
  largeFormData.append('company', 'Apple');
  largeFormData.append('jd', new Blob([largeBuffer], { type: 'text/plain' }), 'large_jd.txt');
  const largeRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: largeFormData,
  });
  const largeData = await largeRes.json();
  assert(
    largeRes.status === 400,
    `Reject files > 5MB with 400 status code (Got status ${largeRes.status})`
  );

  // TEST 5: Save Target Job (Valid Company Name + Valid JD File)
  console.log('\n--- Test 5: Save Target Job ---');
  const validFormData = new FormData();
  validFormData.append('company', 'Google');
  validFormData.append(
    'jd',
    new Blob(
      [
        'Google Software Engineer Role:\nRequirements:\n- Proficiency in Python, React, Data Structures, Algorithms, Docker, and Cloud.\n- Strong problem-solving and communication abilities.',
      ],
      { type: 'text/plain' }
    ),
    'Google_SWE_JD.txt'
  );
  const saveRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: validFormData,
  });
  const saveData = await saveRes.json();
  assert(
    saveRes.status === 200 &&
      saveData.success &&
      saveData.data.company === 'Google' &&
      saveData.data.jdFileName === 'Google_SWE_JD.txt',
    `Target job saved: Company: "${saveData.data?.company}", JD: "${saveData.data?.jdFileName}"`
  );

  // TEST 6: Retrieve Target Job
  console.log('\n--- Test 6: Retrieve Target Job ---');
  const getRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const getData = await getRes.json();
  assert(
    getRes.status === 200 &&
      getData.success &&
      getData.data.company === 'Google' &&
      getData.data.jdFileName === 'Google_SWE_JD.txt' &&
      getData.data.jobDescription.includes('Google Software Engineer Role'),
    'Retrieve returns correct company, jdFileName, and full extracted text'
  );

  // TEST 7: Replace JD
  console.log('\n--- Test 7: Replace JD ---');
  const replaceFormData = new FormData();
  replaceFormData.append('company', 'Google Cloud');
  replaceFormData.append(
    'jd',
    new Blob(
      [
        'Google Cloud Backend Engineer Role:\nRequirements: Go, Kubernetes, Microservices, Distributed Systems, SQL.',
      ],
      { type: 'text/plain' }
    ),
    'Google_Cloud_Replacement_JD.docx'
  );
  const replaceRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: replaceFormData,
  });
  const replaceData = await replaceRes.json();
  assert(
    replaceRes.status === 200 &&
      replaceData.success &&
      replaceData.data.company === 'Google Cloud' &&
      replaceData.data.jdFileName === 'Google_Cloud_Replacement_JD.docx',
    'Target Job replaced with new company name and replacement JD file'
  );

  // TEST 8: Student Ownership / Security Isolation
  console.log('\n--- Test 8: Student Ownership & Security ---');
  const studentBGetRes = await fetch(`${BASE_URL}/target-job`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const studentBGetData = await studentBGetRes.json();
  assert(
    studentBGetRes.status === 200 && studentBGetData.data === null,
    "Student B has isolated session and cannot view Student A's target job"
  );

  // TEST 9B: Continue to AI Analysis only after both Resume + JD exist
  console.log('\n--- Test 9: Unlock AI Analysis State ---');
  // Check Student A dashboard
  const dashARes = await fetch(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const dashAData = await dashARes.json();
  assert(
    dashAData.data.hasResume === true &&
      dashAData.data.hasTargetJob === true &&
      dashAData.data.canAccessAnalysis === true &&
      dashAData.data.stage === 3,
    'Student A has both Resume + JD: canAccessAnalysis is true, Stage is 3'
  );

  // Check Student B dashboard (No Resume, No Target Job)
  const dashBRes = await fetch(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const dashBData = await dashBRes.json();
  assert(
    dashBData.data.hasResume === false &&
      dashBData.data.hasTargetJob === false &&
      dashBData.data.canAccessAnalysis === false &&
      dashBData.data.stage === 1,
    'Student B without Resume/JD: canAccessAnalysis is false, Stage is 1'
  );

  // Trigger AI Analysis for Student A
  const triggerRes = await fetch(`${BASE_URL}/student/trigger-analysis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const triggerData = await triggerRes.json();
  assert(
    triggerRes.status === 200 &&
      triggerData.success &&
      triggerData.data.progress.aiAnalysisCompleted === true &&
      Array.isArray(triggerData.data.aiAnalysisData.strongSkills),
    'AI Analysis triggered and completed, yielding matched skills and recommended preparation topics'
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
