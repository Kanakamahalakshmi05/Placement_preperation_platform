const BASE_URL = 'http://127.0.0.1:5000/api';

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING TWO-ROLE RBAC VERIFICATION SUITE: [STUDENT, ADMIN]');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const tokens = {};

  try {
    // Test 1: Verify /api/health still works
    console.log('1️⃣  Checking /api/health regression...');
    const healthRes = await request('/health');
    if (!healthRes.ok) throw new Error(`Health check failed with status ${healthRes.status}`);
    console.log(`   ✅ /api/health responded: 200 OK (DB status: ${healthRes.data.services.database.status})`);

    // Test 2: Public Student Registration
    console.log('\n2️⃣  Testing public Student Registration (POST /api/auth/register)...');
    const studentData = {
      name: 'Priya Patel',
      email: `student_${timestamp}@example.com`,
      password: 'StudentPassword123!',
    };
    const studentRegRes = await request('/auth/register', { method: 'POST', body: studentData });
    if (studentRegRes.status === 201 && studentRegRes.data.token) {
      tokens.student = studentRegRes.data.token;
      if (studentRegRes.data.user.role !== 'Student') {
        throw new Error(`Expected role 'Student', got '${studentRegRes.data.user.role}'`);
      }
      console.log(`   ✅ Public registration created Student role: ${studentRegRes.data.user.email} (Role: ${studentRegRes.data.user.role})`);
    } else {
      throw new Error(`Student registration failed: ${JSON.stringify(studentRegRes.data)}`);
    }

    // Test 3: Unauthorized Admin Registration Attempt
    console.log('\n3️⃣  Testing unauthorized Admin Registration attempt...');
    const fakeAdminRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker Admin',
        email: `fake_admin_${timestamp}@example.com`,
        password: 'Password123!',
        role: 'Admin', // Attempting to register as Admin without secret key
      },
    });
    if (fakeAdminRes.status === 403) {
      console.log(`   ✅ Unauthorized Admin registration blocked (403 Forbidden: "${fakeAdminRes.data.message}")`);
    } else {
      throw new Error(`Expected 403 Forbidden for unauthorized admin registration, got ${fakeAdminRes.status}`);
    }

    // Test 4: Authorized Admin Creation with Admin Secret
    console.log('\n4️⃣  Testing authorized Admin creation with administrative secret...');
    const adminData = {
      name: 'Dev Admin',
      email: `admin_${timestamp}@example.com`,
      password: 'AdminPassword123!',
      role: 'Admin',
      adminSecret: 'placement_admin_secret_2026',
    };
    const adminRegRes = await request('/auth/register', { method: 'POST', body: adminData });
    if (adminRegRes.status === 201 && adminRegRes.data.token && adminRegRes.data.user.role === 'Admin') {
      tokens.admin = adminRegRes.data.token;
      console.log(`   ✅ Authorized Admin registered: ${adminRegRes.data.user.email} (Role: ${adminRegRes.data.user.role})`);
    } else {
      throw new Error(`Authorized Admin creation failed: ${JSON.stringify(adminRegRes.data)}`);
    }

    // Test 5: Duplicate Email rejection
    console.log('\n5️⃣  Testing duplicate email rejection...');
    const dupRes = await request('/auth/register', { method: 'POST', body: studentData });
    if (dupRes.status === 400) {
      console.log(`   ✅ Duplicate email rejected as expected (400 Bad Request: "${dupRes.data.message}")`);
    } else {
      throw new Error(`Expected 400 Bad Request for duplicate email, got ${dupRes.status}`);
    }

    // Test 6: Short Password validation
    console.log('\n6️⃣  Testing short password validation (< 6 chars)...');
    const shortRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Short Pass',
        email: `short_${timestamp}@example.com`,
        password: '123',
      },
    });
    if (shortRes.status === 400) {
      console.log(`   ✅ Short password rejected as expected (400 Bad Request: "${shortRes.data.message}")`);
    } else {
      throw new Error(`Expected 400 Bad Request for short password, got ${shortRes.status}`);
    }

    // Test 7: Student & Admin Login
    console.log('\n7️⃣  Testing Login endpoint for Student & Admin...');
    const studentLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: studentData.email, password: studentData.password },
    });
    if (studentLogin.status === 200 && studentLogin.data.token) {
      console.log(`   ✅ Student login successful: ${studentLogin.data.user.name} (Role: ${studentLogin.data.user.role})`);
    } else {
      throw new Error(`Student login failed: ${JSON.stringify(studentLogin.data)}`);
    }

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: adminData.email, password: adminData.password },
    });
    if (adminLogin.status === 200 && adminLogin.data.token) {
      console.log(`   ✅ Admin login successful: ${adminLogin.data.user.name} (Role: ${adminLogin.data.user.role})`);
    } else {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }

    // Test 8: Wrong password
    console.log('\n8️⃣  Testing wrong password rejection...');
    const wrongPassRes = await request('/auth/login', {
      method: 'POST',
      body: { email: studentData.email, password: 'WrongPassword999!' },
    });
    if (wrongPassRes.status === 401) {
      console.log(`   ✅ Wrong password rejected: 401 Unauthorized ("${wrongPassRes.data.message}")`);
    } else {
      throw new Error(`Expected 401 for wrong password, got ${wrongPassRes.status}`);
    }

    // Test 9: Unauthenticated protected route access
    console.log('\n9️⃣  Testing unauthenticated request to protected route...');
    const noTokenRes = await request('/auth/me');
    if (noTokenRes.status === 401) {
      console.log(`   ✅ Protected route without token rejected: 401 Unauthorized ("${noTokenRes.data.message}")`);
    } else {
      throw new Error(`Expected 401 for missing token, got ${noTokenRes.status}`);
    }

    // Test 10: GET /api/auth/me profile
    console.log('\n🔟 Testing GET /api/auth/me profile retrieval...');
    const meStudent = await request('/auth/me', { headers: { Authorization: `Bearer ${tokens.student}` } });
    console.log(`   ✅ /api/auth/me for Student: ${meStudent.data.user.name} (Role: ${meStudent.data.user.role})`);
    const meAdmin = await request('/auth/me', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    console.log(`   ✅ /api/auth/me for Admin: ${meAdmin.data.user.name} (Role: ${meAdmin.data.user.role})`);

    // Test 11: Two-Role RBAC Matrix Check
    console.log('\n1️⃣1️⃣ Testing Two-Role RBAC Matrix:');

    // 11A. Student Area (/api/auth/student-area) -> Allowed: Student & Admin
    console.log('   --- Student Area (/api/auth/student-area) ---');
    const studRes1 = await request('/auth/student-area', { headers: { Authorization: `Bearer ${tokens.student}` } });
    if (studRes1.status === 200) {
      console.log(`     ✅ STUDENT accessing student-area: Allowed (200 OK)`);
    } else {
      throw new Error(`Expected 200 for Student on student-area, got ${studRes1.status}`);
    }

    const studRes2 = await request('/auth/student-area', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    if (studRes2.status === 200) {
      console.log(`     ✅ ADMIN accessing student-area: Allowed (200 OK)`);
    } else {
      throw new Error(`Expected 200 for Admin on student-area, got ${studRes2.status}`);
    }

    // 11B. Admin Area (/api/auth/admin-area) -> Allowed: Admin | Forbidden: Student
    console.log('   --- Admin Area (/api/auth/admin-area) ---');
    const adminStudRes = await request('/auth/admin-area', { headers: { Authorization: `Bearer ${tokens.student}` } });
    if (adminStudRes.status === 403) {
      console.log(`     ✅ STUDENT accessing admin-area: Blocked (403 Forbidden as expected)`);
    } else {
      throw new Error(`Expected 403 for Student on admin-area, got ${adminStudRes.status}`);
    }

    const adminAdminRes = await request('/auth/admin-area', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    if (adminAdminRes.status === 200) {
      console.log(`     ✅ ADMIN accessing admin-area: Allowed (200 OK)`);
    } else {
      throw new Error(`Expected 200 for Admin on admin-area, got ${adminAdminRes.status}`);
    }

    // 11C. Admin Overview & Directory (/api/admin/overview & /api/admin/students)
    console.log('   --- Administrative Overview & Directory (/api/admin/*) ---');
    const adminOverviewStud = await request('/admin/overview', { headers: { Authorization: `Bearer ${tokens.student}` } });
    if (adminOverviewStud.status === 403) {
      console.log(`     ✅ STUDENT accessing /api/admin/overview: Blocked (403 Forbidden)`);
    } else {
      throw new Error(`Expected 403 for Student on /api/admin/overview, got ${adminOverviewStud.status}`);
    }

    const adminOverviewAdmin = await request('/admin/overview', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    if (adminOverviewAdmin.status === 200 && adminOverviewAdmin.data.data.stats) {
      console.log(`     ✅ ADMIN accessing /api/admin/overview: Allowed (200 OK, Stats: ${JSON.stringify(adminOverviewAdmin.data.data.stats)})`);
    } else {
      throw new Error(`Expected 200 for Admin on /api/admin/overview, got ${adminOverviewAdmin.status}`);
    }

    const adminStudentsAdmin = await request('/admin/students', { headers: { Authorization: `Bearer ${tokens.admin}` } });
    if (adminStudentsAdmin.status === 200) {
      console.log(`     ✅ ADMIN accessing /api/admin/students: Allowed (200 OK, Count: ${adminStudentsAdmin.data.count} students)`);
    } else {
      throw new Error(`Expected 200 for Admin on /api/admin/students, got ${adminStudentsAdmin.status}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL TWO-ROLE RBAC & AUTH TESTS PASSED 100%!');
    console.log('====================================================\n');
  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    process.exit(1);
  }
};

runTests();
