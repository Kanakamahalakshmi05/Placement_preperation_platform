const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

(async () => {
  const email = `check_fresh_${Date.now()}@test.com`;
  console.log('Registering fresh user:', email);
  const reg = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Fresh Student', email, password: 'Password123!' }
  );
  const token = reg.data.token;
  console.log('Registered. Token received.');

  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('\nGET /api/student/dashboard:');
  console.log(dashRes.data.data);

  const resumeRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resume/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('\nGET /api/resume/me:');
  console.log('Status:', resumeRes.status);
  console.log('Body:', resumeRes.data);
})();
