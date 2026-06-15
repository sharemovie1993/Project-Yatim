const BASE_URL = 'http://localhost:5002/api';

async function testAuthApi() {
  console.log('=== STARTING AUTH API TEST ===');

  const testEmail = `test_admin_${Date.now().toString().slice(-4)}@example.com`;
  const testPassword = 'PasswordSangatRahasia123';

  try {
    // 1. Test Register
    console.log('[1/2] Testing POST /api/v1/auth/register...');
    const regRes = await fetch(`${BASE_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Mimin Uji Coba',
        tenant_name: 'Sekolah CRUD Uji',
        domain_or_slug: 'sekolah-test-' + Date.now().toString().slice(-4)
      })
    });

    const regData = await regRes.json();
    console.log('Register Response:', regData);
    if (!regData.success) throw new Error('Registration failed: ' + regData.error);

    // 2. Test Login
    console.log('\n[2/2] Testing POST /api/v1/auth/login...');
    const logRes = await fetch(`${BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const logData = await logRes.json();
    console.log('Login Response:', logData);
    if (!logData.success) throw new Error('Login failed: ' + logData.error);

    console.log('\n✓ JWT Token received successfully:', logData.token.substring(0, 30) + '...');
    console.log('\n=== AUTH API TEST PASSED SUCCESSFULLY (100%) ===');

  } catch (error) {
    console.error('\n❌ AUTH API TEST FAILED:', error.message);
  }
}

testAuthApi();
