const http = require('http');

// Login first
const loginData = JSON.stringify({
  username: 'admin',
  password: 'Admin@123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const loginResult = JSON.parse(data);
      console.log('Login successful');
      console.log('Token:', loginResult.token.substring(0, 20) + '...');
      
      // Now test taxpayers endpoint
      const taxpayersOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/taxpayers',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.token}`
        }
      };
      
      const taxpayersReq = http.request(taxpayersOptions, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => data2 += chunk);
        res2.on('end', () => {
          try {
            const result = JSON.parse(data2);
            console.log('\nTaxpayers API Response:');
            console.log('Status:', res2.statusCode);
            console.log('Total taxpayers:', result.total);
            console.log('First taxpayer:', result.taxpayers[0]?.name || 'None');
            console.log('\nFull response:', JSON.stringify(result, null, 2).substring(0, 500));
          } catch (e) {
            console.error('Parse error:', e.message);
            console.log('Raw response:', data2);
          }
        });
      });
      
      taxpayersReq.on('error', (e) => console.error('Taxpayers request error:', e.message));
      taxpayersReq.end();
      
    } catch (e) {
      console.error('Login parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

loginReq.on('error', (e) => console.error('Login request error:', e.message));
loginReq.write(loginData);
loginReq.end();