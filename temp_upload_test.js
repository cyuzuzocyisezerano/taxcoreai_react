const fetch = global.fetch;
(async () => {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
  });
  console.log('login status', loginRes.status);
  const loginData = await loginRes.json();
  console.log('token', loginData.token ? 'present' : 'missing');
  const formData = new FormData();
  formData.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'test.txt');
  formData.append('title', 'Test Upload');
  formData.append('type', 'Test');
  formData.append('tags', 'x');
  const res = await fetch('http://localhost:3001/api/documents', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + loginData.token },
    body: formData
  });
  const body = await res.text();
  console.log('upload status', res.status);
  console.log(body);
})().catch(err => { console.error(err); process.exit(1); });
