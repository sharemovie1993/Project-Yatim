const BASE_URL = 'http://localhost:5002/api';
const tenantId = '5bf20421-6695-45aa-a6a9-63355b28fa9e';

async function testExcelApi() {
  console.log('=== STARTING EXCEL IMPORT/EXPORT API TEST ===');

  try {
    // 1. Test Export Excel
    console.log('[1/2] Testing GET /api/v1/mustahiq/export...');
    const exportRes = await fetch(`${BASE_URL}/v1/mustahiq/export?tenant_id=${tenantId}`);
    
    if (!exportRes.ok) {
      throw new Error(`Export failed with HTTP status: ${exportRes.status}`);
    }

    const arrayBuffer = await exportRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`✓ Export successful! File size: ${buffer.length} bytes.`);

    // 2. Test Import Excel (using the exported buffer)
    console.log('\n[2/2] Testing POST /api/v1/mustahiq/import-excel...');
    
    // Construct FormData to upload the buffer as a file
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'mustahiqs.xlsx');

    const fakePayload = { expires_at: '2029-12-31' };
    const fakeToken = "fakeheader." + Buffer.from(JSON.stringify(fakePayload)).toString('base64') + ".fakesig";

    const importRes = await fetch(`${BASE_URL}/v1/mustahiq/import-excel?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: {
        'x-license-token': fakeToken
      },
      body: formData
    });

    const importData = await importRes.json();
    console.log('Import Response:', importData);

    if (importData.success) {
      console.log(`✓ Import successful! Parsed and loaded ${importData.count} records back into database.`);
      console.log('\n=== EXCEL API TEST PASSED SUCCESSFULLY (100%) ===');
    } else {
      throw new Error('Import failed: ' + importData.error);
    }
  } catch (error) {
    console.error('\n❌ EXCEL API TEST FAILED:', error.message);
  }
}

testExcelApi();
