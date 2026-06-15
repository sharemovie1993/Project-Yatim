const tenantId = '5bf20421-6695-45aa-a6a9-63355b28fa9e'; // Test tenant ID
const BASE_URL = 'http://localhost:5002/api';

async function testLicenseSync() {
  console.log('=== STARTING HTTP API LICENSE SYNC TEST ===');
  try {
    const res = await fetch(`${BASE_URL}/v1/license/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
      }
    });

    const data = await res.json();
    console.log('Sync Response:', data);

    if (data.success) {
      console.log('✓ License sync test passed! Server verified our database license key.');
    } else {
      console.warn('⚠️ Server returned failure, but connection succeeded. Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testLicenseSync();
