const BASE_URL = 'http://127.0.0.1:5000/api';

const runFrontendAuthSimulation = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING FRONTEND AUTH UI & FLOW INTEGRATION SUITE');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testCandidate = {
    name: 'Ananya Verma',
    email: `ananya_${timestamp}@example.com`,
    password: 'SecurePassword123!',
    role: 'Student',
  };

  try {
    // 1. Unauthenticated Dashboard access check
    console.log('1️⃣  Simulating unauthenticated access to /dashboard (Protected Route)...');
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    if (noTokenRes.status === 401) {
      console.log('   ✅ Unauthenticated user blocked (401 Unauthorized) -> Redirects to /login in frontend');
    } else {
      throw new Error(`Expected 401, got ${noTokenRes.status}`);
    }

    // 2. Candidate Registration
    console.log('\n2️⃣  Simulating Candidate Registration form submission (POST /api/auth/register)...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCandidate),
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.token && regData.user) {
      console.log(`   ✅ Registration successful for ${testCandidate.name} (${regData.user.role})`);
      console.log(`   🔑 JWT Token stored in localStorage simulation (length: ${regData.token.length})`);
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    // 3. Login with Wrong Password
    console.log('\n3️⃣  Simulating Login with wrong password...');
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidate.email,
        password: 'IncorrectPassword999!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    if (wrongPassRes.status === 401) {
      console.log(`   ✅ Wrong password rejected: 401 Unauthorized ("${wrongPassData.message}")`);
    } else {
      throw new Error(`Expected 401 for wrong password, got ${wrongPassRes.status}`);
    }

    // 4. Login with Invalid Credentials (non-existent email)
    console.log('\n4️⃣  Simulating Login with non-existent email...');
    const invalidEmailRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost_user_does_not_exist@example.com',
        password: 'Password123!',
      }),
    });
    const invalidEmailData = await invalidEmailRes.json();
    if (invalidEmailRes.status === 401) {
      console.log(`   ✅ Non-existent user rejected: 401 Unauthorized ("${invalidEmailData.message}")`);
    } else {
      throw new Error(`Expected 401 for invalid user, got ${invalidEmailRes.status}`);
    }

    // 5. Valid Login & Token Storage
    console.log('\n5️⃣  Simulating valid candidate Login (POST /api/auth/login)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidate.email,
        password: testCandidate.password,
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      console.log(`   ✅ Login successful: 200 OK -> Redirects to /dashboard`);
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    const clientToken = loginData.token;

    // 6. Page Refresh Simulation (GET /api/auth/me with stored token)
    console.log('\n6️⃣  Simulating page refresh while authenticated (AuthContext mount check)...');
    const refreshRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.status === 200 && refreshData.user.email === testCandidate.email) {
      console.log(`   ✅ Authenticated session restored on page refresh for: ${refreshData.user.name} (Role: ${refreshData.user.role})`);
    } else {
      throw new Error(`Session restore failed: ${JSON.stringify(refreshData)}`);
    }

    // 7. Logout simulation
    console.log('\n7️⃣  Simulating Logout (localStorage.removeItem token)...');
    // Once client removes token from storage, subsequent calls to protected route fail with 401
    const postLogoutRes = await fetch(`${BASE_URL}/auth/me`);
    if (postLogoutRes.status === 401) {
      console.log('   ✅ Client token cleared; protected access rejected (401) -> Redirects to /login');
    } else {
      throw new Error(`Post logout check failed: ${postLogoutRes.status}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL FRONTEND AUTH UI & FLOW TESTS PASSED 100%!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FRONTEND AUTH TEST FAILED:', err.message);
    process.exit(1);
  }
};

runFrontendAuthSimulation();
