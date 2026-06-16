const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// GET /api/v1/kategori
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    let data = await prisma.kategori.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nama_kategori: 'asc' }
    });
    
    if (data.length === 0) {
      const defaults = [
        { nama_kategori: 'YATIM', keterangan: 'Anak yatim yang kehilangan ayah' },
        { nama_kategori: 'PIATU', keterangan: 'Anak piatu yang kehilangan ibu' },
        { nama_kategori: 'YATIM PIATU', keterangan: 'Anak yatim piatu yang kehilangan kedua orang tua' },
        { nama_kategori: 'DHUAFA', keterangan: 'Golongan masyarakat miskin atau lemah secara ekonomi' },
        { nama_kategori: 'FAKIR MISKIN', keterangan: 'Masyarakat yang tidak memiliki pekerjaan tetap atau tidak mampu memenuhi kebutuhan pokok' }
      ];
      
      await Promise.all(
        defaults.map(d =>
          prisma.kategori.create({
            data: {
              tenant_id: tenantId,
              nama_kategori: d.nama_kategori,
              keterangan: d.keterangan
            }
          })
        )
      );
      
      data = await prisma.kategori.findMany({
        where: { tenant_id: tenantId },
        orderBy: { nama_kategori: 'asc' }
      });
    }

    // Fetch counts of mustahiq grouped by kategori
    const counts = await prisma.mustahiq.groupBy({
      by: ['kategori'],
      where: { tenant_id: tenantId },
      _count: {
        id: true
      }
    });

    const countMap = {};
    counts.forEach(c => {
      if (c.kategori) {
        countMap[c.kategori.toUpperCase()] = c._count.id;
      }
    });

    const dataWithCounts = data.map(item => ({
      ...item,
      mustahiq_count: countMap[item.nama_kategori.toUpperCase()] || 0
    }));
    
    res.json({ success: true, data: dataWithCounts });
  } catch (error) {
    console.error('[GET Kategori Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/kategori
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { nama_kategori, keterangan } = req.body;
    if (!nama_kategori) {
      return res.status(400).json({ success: false, error: 'Nama kategori is required.' });
    }

    const normalizedName = nama_kategori.trim().toUpperCase();

    // Check for duplicate category name
    const existing = await prisma.kategori.findFirst({
      where: { tenant_id: tenantId, nama_kategori: normalizedName }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Kategori dengan nama tersebut sudah ada.' });
    }

    const data = await prisma.kategori.create({
      data: {
        tenant_id: tenantId,
        nama_kategori: normalizedName,
        keterangan: keterangan ? keterangan.trim() : null
      }
    });
    
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[POST Kategori Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/kategori/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kategori, keterangan } = req.body;

    const oldCategory = await prisma.kategori.findUnique({
      where: { id }
    });
    if (!oldCategory) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan.' });
    }

    let normalizedName = oldCategory.nama_kategori;
    if (nama_kategori) {
      normalizedName = nama_kategori.trim().toUpperCase();
      
      // Check duplicate category name
      const existing = await prisma.kategori.findFirst({
        where: {
          tenant_id: oldCategory.tenant_id,
          nama_kategori: normalizedName,
          NOT: { id }
        }
      });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Kategori dengan nama tersebut sudah ada.' });
      }
    }

    const data = await prisma.kategori.update({
      where: { id },
      data: {
        nama_kategori: normalizedName,
        keterangan: keterangan !== undefined ? (keterangan ? keterangan.trim() : null) : undefined
      }
    });

    // Cascade update mustahiq records if the name was changed
    if (oldCategory.nama_kategori !== normalizedName) {
      await prisma.mustahiq.updateMany({
        where: { tenant_id: oldCategory.tenant_id, kategori: oldCategory.nama_kategori },
        data: { kategori: normalizedName }
      });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PUT Kategori Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/kategori/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.kategori.findUnique({
      where: { id }
    });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Kategori tidak ditemukan.' });
    }

    // Check if category is used by any mustahiq
    const usageCount = await prisma.mustahiq.count({
      where: { tenant_id: category.tenant_id, kategori: category.nama_kategori }
    });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Kategori '${category.nama_kategori}' sedang digunakan oleh ${usageCount} mustahiq dan tidak dapat dihapus.`
      });
    }

    await prisma.kategori.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Kategori deleted successfully.' });
  } catch (error) {
    console.error('[DELETE Kategori Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
