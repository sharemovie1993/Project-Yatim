const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Helper to get tenant ID from request headers or query
const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// GET /api/v1/mustahiq
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const activeOnly = req.query.activeOnly === 'true';
    const where = { tenant_id: tenantId };
    if (activeOnly) {
      where.status = 'AKTIF';
    }

    const data = await prisma.mustahiq.findMany({
      where,
      orderBy: { nama_lengkap: 'asc' }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[GET Mustahiq Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to check/validate quota
async function validateQuota(req, tenantId, countToInsert = 1) {
  // 1. Get tenant profile (auto-upsert for local/testing database convenience)
  let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Madrasah Uji Coba',
        domain_or_slug: 'demo',
        license_key: 'ORK-DEMO-TEST-KEY-2026',
        settings: JSON.stringify({
          theme: { primary_color: "#059669", accent_color: "#D97706" },
          branding: { slogan: "Berbagi Kehangatan Bersama Yatim Dhuafa" },
          rules: { max_mustahiq: 100, max_age_yatim: 15 }
        })
      }
    });
  }

  let settings = {};
  try {
    settings = JSON.parse(tenant.settings || '{}');
  } catch (e) {
    settings = {};
  }

  let maxMustahiq = settings.rules?.max_mustahiq !== undefined 
    ? settings.rules.max_mustahiq 
    : 100;

  // Check x-license-token header for unlimited status bypass
  const licenseToken = req.headers['x-license-token'];
  if (licenseToken) {
    try {
      const parts = licenseToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload && payload.expires_at) {
          const todayStr = new Date().toISOString().slice(0, 10);
          if (payload.expires_at >= todayStr) {
            maxMustahiq = 99999;
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase Limit Bypass] Failed to check license token', e);
    }
  }

  if (maxMustahiq > 0) {
    // 2. Count current active/survey mustahiqs (excluding TIDAK_AKTIF)
    const count = await prisma.mustahiq.count({
      where: {
        tenant_id: tenantId,
        status: { in: ['AKTIF', 'SURVEY'] }
      }
    });

    const currentCount = count || 0;
    if (currentCount + countToInsert > maxMustahiq) {
      throw new Error(`Batas kuota mustahiq aktif tercapai (Maksimal: ${maxMustahiq}, Saat ini: ${currentCount}, Ingin menambah: ${countToInsert}). Silakan nonaktifkan data lama atau hubungi admin.`);
    }
  }
}

// POST /api/v1/mustahiq
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const mustahiqData = req.body;
    
    // Validate quota
    await validateQuota(req, tenantId, 1);

    const data = await prisma.mustahiq.create({
      data: {
        ...mustahiqData,
        tenant_id: tenantId
      }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[POST Mustahiq Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/mustahiq/import (Bulk import)
router.post('/import', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { payloads } = req.body;
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return res.status(400).json({ success: false, error: 'Payloads array is required and cannot be empty.' });
    }

    // Validate quota
    await validateQuota(req, tenantId, payloads.length);

    const dataWithTenant = payloads.map(p => ({
      ...p,
      tenant_id: tenantId
    }));

    // SQLite/Prisma createMany is supported
    const createRes = await prisma.mustahiq.createMany({
      data: dataWithTenant
    });

    res.json({ success: true, count: createRes.count || 0 });
  } catch (error) {
    console.error('[POST Mustahiq Import Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/mustahiq/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const data = await prisma.mustahiq.update({
      where: { id },
      data: updates
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[PUT Mustahiq Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/mustahiq/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.mustahiq.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Mustahiq deleted successfully.' });
  } catch (error) {
    console.error('[DELETE Mustahiq Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/mustahiq/export
router.get('/export', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const data = await prisma.mustahiq.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nama_lengkap: 'asc' }
    });

    const cleanData = data.map(m => ({
      'NIK': m.nik || '',
      'Nama Lengkap': m.nama_lengkap,
      'Kategori': m.kategori,
      'Jenis Kelamin': m.jenis_kelamin || '',
      'Tanggal Lahir': m.tanggal_lahir || '',
      'Alamat Lengkap': m.alamat_lengkap,
      'No Telepon': m.no_telepon || '',
      'Nama Wali': m.nama_wali || '',
      'Orang Tua Asuh': m.orang_tua_asuh || '',
      'Status': m.status,
      'Catatan': m.catatan || ''
    }));

    const xlsx = require('xlsx');
    const ws = xlsx.utils.json_to_sheet(cleanData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Mustahiq List');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mustahiqs.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('[Export Mustahiq Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/mustahiq/import-excel
router.post('/import-excel', upload.single('file'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Excel file is required.' });
    }

    const xlsx = require('xlsx');
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Excel file is empty.' });
    }

    const payloads = rows.map(r => ({
      nik: r['NIK'] ? String(r['NIK']) : null,
      nama_lengkap: r['Nama Lengkap'] || r['Nama'] || r['nama'] || '',
      kategori: r['Kategori'] || r['kategori'] || 'DHUAFA',
      jenis_kelamin: r['Jenis Kelamin'] || r['Gender'] || null,
      tanggal_lahir: r['Tanggal Lahir'] ? String(r['Tanggal Lahir']) : null,
      alamat_lengkap: r['Alamat Lengkap'] || r['Alamat'] || '',
      no_telepon: r['No Telepon'] ? String(r['No Telepon']) : null,
      nama_wali: r['Nama Wali'] || null,
      orang_tua_asuh: r['Orang Tua Asuh'] || null,
      status: r['Status'] || 'SURVEY',
      catatan: r['Catatan'] || null
    })).filter(p => p.nama_lengkap && p.alamat_lengkap);

    await validateQuota(req, tenantId, payloads.length);

    const dataWithTenant = payloads.map(p => ({
      ...p,
      tenant_id: tenantId
    }));

    const createRes = await prisma.mustahiq.createMany({
      data: dataWithTenant
    });

    res.json({ success: true, count: createRes.count || 0 });
  } catch (error) {
    console.error('[Import Excel Mustahiq Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

