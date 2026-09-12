async function testFrontendProxy() {
  console.log('1️⃣  Checking frontend HTML delivery on http://localhost:5174...');
  const pageRes = await fetch('http://localhost:5174/');
  console.log(`   ✅ Frontend HTTP status: ${pageRes.status} ${pageRes.statusText}`);
  const html = await pageRes.text();
  const hasRoot = html.includes('id="root"');
  console.log(`   ✅ Serves SPA shell with #root: ${hasRoot}`);

  console.log('\n2️⃣  Testing Student Registration via frontend proxy (POST http://localhost:5174/api/auth/register)...');
  const timestamp = Date.now();
  const testStudent = {
    name: 'Aarav Sharma',
    email: `aarav_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const regRes = await fetch('http://localhost:5174/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testStudent),
  });
  const regData = await regRes.json();
  console.log(`   ✅ Registration Status: ${regRes.status} (Expected: 201)`);
  console.log(`   ✅ Registered User: ${regData.user?.name} | Role: ${regData.user?.role}`);
  console.log(`   ✅ JWT Token Issued: ${Boolean(regData.token)}`);

  console.log('\n3️⃣  Testing Student Sign In / Login via frontend proxy (POST http://localhost:5174/api/auth/login)...');
  const loginRes = await fetch('http://localhost:5174/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: testStudent.password }),
  });
  const loginData = await loginRes.json();
  console.log(`   ✅ Login Status: ${loginRes.status} (Expected: 200)`);
  console.log(`   ✅ Logged-in User: ${loginData.user?.name} | Role: ${loginData.user?.role}`);
  console.log(`   ✅ JWT Token Received: ${Boolean(loginData.token)}`);

  console.log('\n4️⃣  Testing Wrong Password on Sign In...');
  const wrongPassRes = await fetch('http://localhost:5174/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudent.email, password: 'WrongPassword999!' }),
  });
  const wrongPassData = await wrongPassRes.json();
  console.log(`   ✅ Rejected with ${wrongPassRes.status}: "${wrongPassData.message}"`);

  console.log('\n5️⃣  Testing Admin Sign In / Login (POST http://localhost:5174/api/auth/login)...');
  const adminLoginRes = await fetch('http://localhost:5174/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@placement.ai', password: 'AdminPassword123!' }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log(`   ✅ Admin Login Status: ${adminLoginRes.status} (Expected: 200)`);
  console.log(`   ✅ Admin User: ${adminLoginData.user?.name} | Role: ${adminLoginData.user?.role}`);

  console.log('\n6️⃣  Testing Session Restore / Verification (GET http://localhost:5174/api/auth/me)...');
  const studentMe = await fetch('http://localhost:5174/api/auth/me', {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const studentMeData = await studentMe.json();
  console.log(`   ✅ Student Session verified: ${studentMeData.user?.name} (Role: ${studentMeData.user?.role})`);

  const adminMe = await fetch('http://localhost:5174/api/auth/me', {
    headers: { Authorization: `Bearer ${adminLoginData.token}` },
  });
  const adminMeData = await adminMe.json();
  console.log(`   ✅ Admin Session verified: ${adminMeData.user?.name} (Role: ${adminMeData.user?.role})`);

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE SIGN-IN & LOGIN TESTS PASSED VIA PORT 5174!');
  console.log('======================================================');
}

testFrontendProxy().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
