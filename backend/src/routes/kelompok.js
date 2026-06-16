const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// ==========================================
// KELOMPOK ENDPOINTS
// ==========================================

// GET /api/v1/kelompok
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const data = await prisma.kelompok.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: { anggota: true }
        }
      },
      orderBy: { nama_kelompok: 'asc' }
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[GET Kelompok Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/kelompok
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { nama_kelompok, keterangan, wilayah } = req.body;
    if (!nama_kelompok) {
      return res.status(400).json({ success: false, error: 'Nama kelompok is required.' });
    }

    const data = await prisma.kelompok.create({
      data: { nama_kelompok, keterangan, wilayah, tenant_id: tenantId }
    });
    
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[POST Kelompok Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/kelompok/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const data = await prisma.kelompok.update({
      where: { id },
      data: updates
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[PUT Kelompok Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/kelompok/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.kelompok.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Kelompok deleted successfully.' });
  } catch (error) {
    console.error('[DELETE Kelompok Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// ANGGOTA KELOMPOK ENDPOINTS
// ==========================================

// GET /api/v1/kelompok/:kelompokId/anggota
router.get('/:kelompokId/anggota', async (req, res) => {
  try {
    const { kelompokId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const rows = await prisma.anggotaKelompok.findMany({
      where: {
        kelompok_id: kelompokId,
        tenant_id: tenantId
      },
      include: {
        mustahiq: true
      }
    });

    const mustahiqs = rows.map(row => row.mustahiq).filter(Boolean);
    res.json({ success: true, data: mustahiqs });
  } catch (error) {
    console.error('[GET Anggota Kelompok Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/kelompok/:kelompokId/anggota
router.post('/:kelompokId/anggota', async (req, res) => {
  try {
    const { kelompokId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { mustahiqIds } = req.body;
    if (!Array.isArray(mustahiqIds) || mustahiqIds.length === 0) {
      return res.status(400).json({ success: false, error: 'mustahiqIds must be a non-empty array.' });
    }

    const payloads = mustahiqIds.map(mid => ({
      kelompok_id: kelompokId,
      mustahiq_id: mid,
      tenant_id: tenantId
    }));

    const createRes = await prisma.anggotaKelompok.createMany({
      data: payloads
    });

    res.json({ success: true, count: createRes.count || 0 });
  } catch (error) {
    console.error('[POST Anggota Kelompok Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/kelompok/:kelompokId/anggota/:mustahiqId
router.delete('/:kelompokId/anggota/:mustahiqId', async (req, res) => {
  try {
    const { kelompokId, mustahiqId } = req.params;

    await prisma.anggotaKelompok.delete({
      where: {
        kelompok_id_mustahiq_id: {
          kelompok_id: kelompokId,
          mustahiq_id: mustahiqId
        }
      }
    });
    
    res.json({ success: true, message: 'Anggota removed successfully.' });
  } catch (error) {
    console.error('[DELETE Anggota Kelompok Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
