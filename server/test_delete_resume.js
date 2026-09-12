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

function uploadResume(token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="resume"; filename="my_test_resume.pdf"\r\n`;
    payload += `Content-Type: text/plain\r\n\r\n`;
    payload += `Skills: React, Node.js, Python, TypeScript.`;
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
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('🧪 Testing Upload -> Delete Resume -> Verify Initial State');
  const email = `del_test_${Date.now()}@test.com`;
  const reg = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Delete Tester', email, password: 'Password123!' }
  );
  const token = reg.data.token;

  // 1. Initially No Resume
  let dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;
  console.log('1. Initial hasResume:', dash.hasResume, 'resumeStatus:', dash.resumeStatus);
  if (dash.hasResume !== false) throw new Error('Failed: initial hasResume should be false');

  // 2. Upload resume
  const up = await uploadResume(token);
  console.log('2. Upload status:', up.status);

  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;
  console.log('3. After upload hasResume:', dash.hasResume, 'fileName:', dash.resumeDetails.fileName);
  if (dash.hasResume !== true) throw new Error('Failed: hasResume should be true after upload');

  // 3. Delete resume
  const del = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resume/me',
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('4. Delete status:', del.status, 'Message:', del.data.message);
  if (del.status !== 200) throw new Error('Failed: delete should return 200');

  // 4. Verify back to State 1
  dash = (await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })).data.data;
  console.log('5. After delete hasResume:', dash.hasResume, 'stage:', dash.stage, 'resumeStatus:', dash.resumeStatus);
  if (dash.hasResume !== false || dash.stage !== 1) throw new Error('Failed: should be back in State 1');

  console.log('✅ ALL CHECKS PASSED: Upload -> Delete -> Reset to State 1 works perfectly!');
})();
