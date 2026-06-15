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
    
    res.json({ success: true, data });
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

    const data = await prisma.kategori.create({
      data: {
        tenant_id: tenantId,
        nama_kategori: nama_kategori.trim().toUpperCase(),
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

    const data = await prisma.kategori.update({
      where: { id },
      data: {
        nama_kategori: nama_kategori ? nama_kategori.trim().toUpperCase() : undefined,
        keterangan: keterangan !== undefined ? (keterangan ? keterangan.trim() : null) : undefined
      }
    });
    
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
