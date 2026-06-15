const BASE_URL = 'http://localhost:5002/api';
const tenantId = '5bf20421-6695-45aa-a6a9-63355b28fa9e';

async function testPdfApi() {
  console.log('=== STARTING PDF SPJ GENERATION TEST ===');

  try {
    // 1. Get a program ID from SQLite using prisma
    const prisma = require('./src/prisma');
    const program = await prisma.programSantunan.findFirst({
      where: { tenant_id: tenantId }
    });

    if (!program) {
      throw new Error('No program found in SQLite to test. Please run migrate_data.js first.');
    }

    console.log(`Using Program: ${program.nama_program} (${program.id})`);

    // 2. Query the PDF route
    console.log(`[1/1] Testing GET /api/v1/program/${program.id}/spj-pdf...`);
    const res = await fetch(`${BASE_URL}/v1/program/${program.id}/spj-pdf?tenant_id=${tenantId}`);

    if (!res.ok) {
      throw new Error(`PDF generation failed with HTTP status: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✓ PDF downloaded successfully. Size: ${buffer.length} bytes.`);

    // Verify PDF header magic bytes "%PDF"
    const pdfMagicBytes = buffer.toString('utf8', 0, 4);
    console.log(`✓ Magic bytes check: "${pdfMagicBytes}"`);
    
    if (pdfMagicBytes === '%PDF') {
      console.log('\n=== PDF API TEST PASSED SUCCESSFULLY (100%) ===');
    } else {
      throw new Error('Downloaded file is not a valid PDF document.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ PDF API TEST FAILED:', error.message);
  }
}

testPdfApi();
