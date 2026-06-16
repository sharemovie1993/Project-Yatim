const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const PdfGenerator = require('../services/pdfGenerator');

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

    const { page, limit, paginate, search, wilayah } = req.query;
    const where = { tenant_id: tenantId };

    if (search) {
      where.nama_kelompok = { contains: String(search).trim() };
    }

    if (wilayah) {
      where.wilayah = { contains: String(wilayah).trim() };
    }

    // Overall stats for this tenant's groups
    const [totalGroupsCount, totalMembersCount] = await Promise.all([
      prisma.kelompok.count({ where: { tenant_id: tenantId } }),
      prisma.anggotaKelompok.count({ where: { tenant_id: tenantId } })
    ]);

    const stats = {
      totalGroups: totalGroupsCount,
      totalMembers: totalMembersCount,
      averageMembers: totalGroupsCount > 0 ? (totalMembersCount / totalGroupsCount).toFixed(1) : '0'
    };

    const isPaginated = paginate === 'true' || page !== undefined;

    if (isPaginated) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skipNum = (pageNum - 1) * limitNum;

      const totalItems = await prisma.kelompok.count({ where });
      const data = await prisma.kelompok.findMany({
        where,
        skip: skipNum,
        take: limitNum,
        include: {
          _count: {
            select: { anggota: true }
          }
        },
        orderBy: { nama_kelompok: 'asc' }
      });

      res.json({
        success: true,
        data,
        stats,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
          limit: limitNum
        }
      });
    } else {
      const data = await prisma.kelompok.findMany({
        where,
        include: {
          _count: {
            select: { anggota: true }
          }
        },
        orderBy: { nama_kelompok: 'asc' }
      });

      res.json({ success: true, data, stats });
    }
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

    // Load tenant settings to verify single group restriction rule
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    let settings = {};
    try {
      settings = JSON.parse(tenant?.settings || '{}');
    } catch (e) {
      settings = {};
    }

    if (settings.rules?.single_group_restriction === true) {
      const existingMemberships = await prisma.anggotaKelompok.findMany({
        where: {
          tenant_id: tenantId,
          mustahiq_id: { in: mustahiqIds },
          NOT: { kelompok_id: kelompokId }
        },
        include: {
          mustahiq: { select: { nama_lengkap: true } },
          kelompok: { select: { nama_kelompok: true } }
        }
      });

      if (existingMemberships.length > 0) {
        const names = existingMemberships.map(m => `${m.mustahiq.nama_lengkap} (di kelompok ${m.kelompok.nama_kelompok})`).join(', ');
        return res.status(400).json({ 
          success: false, 
          error: `Gagal menambahkan anggota. Mustahiq berikut sudah terdaftar di kelompok lain: ${names}` 
        });
      }
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

// GET /api/v1/kelompok/:kelompokId/print-anggota
router.get('/:kelompokId/print-anggota', async (req, res) => {
  try {
    const { kelompokId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    await PdfGenerator.generateDaftarAnggotaPdf(kelompokId, tenantId, res);
  } catch (error) {
    console.error('[GET Print Anggota Kelompok Error]', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// GET /api/v1/kelompok/:kelompokId/print-absensi
router.get('/:kelompokId/print-absensi', async (req, res) => {
  try {
    const { kelompokId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    await PdfGenerator.generateDaftarHadirPdf(kelompokId, tenantId, res);
  } catch (error) {
    console.error('[GET Print Absensi Kelompok Error]', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
