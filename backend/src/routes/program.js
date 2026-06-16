const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const PdfGenerator = require('../services/pdfGenerator');

const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// ==========================================
// PROGRAM SANTUNAN ENDPOINTS
// ==========================================

// GET /api/v1/program
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { page, limit, paginate, search } = req.query;
    const where = { tenant_id: tenantId };

    if (search) {
      where.nama_program = { contains: String(search).trim() };
    }

    // Overall stats for programs
    const [totalPrograms, allProgramsBudget] = await Promise.all([
      prisma.programSantunan.count({ where: { tenant_id: tenantId } }),
      prisma.programSantunan.findMany({
        where: { tenant_id: tenantId },
        select: { total_anggaran: true }
      })
    ]);

    const sumBudget = allProgramsBudget.reduce((acc, row) => acc + (row.total_anggaran || 0), 0);
    const avgBudget = totalPrograms > 0 ? (sumBudget / totalPrograms).toFixed(0) : 0;

    const stats = {
      total: totalPrograms,
      budget: sumBudget,
      average: avgBudget
    };

    const isPaginated = paginate === 'true' || page !== undefined;

    if (isPaginated) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skipNum = (pageNum - 1) * limitNum;

      const totalItems = await prisma.programSantunan.count({ where });
      const data = await prisma.programSantunan.findMany({
        where,
        skip: skipNum,
        take: limitNum,
        include: {
          _count: {
            select: { penyaluran: true }
          }
        },
        orderBy: { tanggal_pelaksanaan: 'desc' }
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
      const data = await prisma.programSantunan.findMany({
        where,
        include: {
          _count: {
            select: { penyaluran: true }
          }
        },
        orderBy: { tanggal_pelaksanaan: 'desc' }
      });

      res.json({ success: true, data, stats });
    }
  } catch (error) {
    console.error('[GET Program Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/program
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { nama_program, tanggal_pelaksanaan, jenis, total_anggaran, status } = req.body;
    const data = await prisma.programSantunan.create({
      data: {
        tenant_id: tenantId,
        nama_program,
        tanggal_pelaksanaan,
        jenis,
        total_anggaran: total_anggaran ? parseFloat(total_anggaran) : 0.0,
        status: status || 'DRAFT'
      }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[POST Program Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/program/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_program, tanggal_pelaksanaan, jenis, total_anggaran, status } = req.body;

    const data = await prisma.programSantunan.update({
      where: { id },
      data: {
        nama_program,
        tanggal_pelaksanaan,
        jenis,
        total_anggaran: total_anggaran ? parseFloat(total_anggaran) : undefined,
        status
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[PUT Program Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/program/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.programSantunan.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Program deleted successfully.' });
  } catch (error) {
    console.error('[DELETE Program Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// PENYALURAN SANTUNAN ENDPOINTS
// ==========================================

// GET /api/v1/program/:programId/penyaluran
router.get('/:programId/penyaluran', async (req, res) => {
  try {
    const { programId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { page, limit, paginate, search, status } = req.query;
    const where = {
      program_id: programId,
      tenant_id: tenantId
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchTrimmed = String(search).trim();
      where.mustahiq = {
        nama_lengkap: { contains: searchTrimmed }
      };
    }

    // Overall stats for this program's distributions
    const [totalPenerima, allPenyaluran, totalTersalurkan, totalBelum, totalBatal] = await Promise.all([
      prisma.penyaluranSantunan.count({ where: { program_id: programId, tenant_id: tenantId } }),
      prisma.penyaluranSantunan.findMany({
        where: { program_id: programId, tenant_id: tenantId },
        select: { jumlah_diterima: true }
      }),
      prisma.penyaluranSantunan.count({ where: { program_id: programId, tenant_id: tenantId, status: 'TERSALURKAN' } }),
      prisma.penyaluranSantunan.count({ where: { program_id: programId, tenant_id: tenantId, status: 'BELUM' } }),
      prisma.penyaluranSantunan.count({ where: { program_id: programId, tenant_id: tenantId, status: 'BATAL' } })
    ]);

    const sumDana = allPenyaluran.reduce((acc, row) => {
      const val = parseInt(String(row.jumlah_diterima || '').replace(/[^0-9]/g, ''), 10) || 0;
      return acc + val;
    }, 0);

    const stats = {
      total: totalPenerima,
      dana: sumDana,
      tersalurkan: totalTersalurkan,
      belum: totalBelum,
      batal: totalBatal
    };

    const isPaginated = paginate === 'true' || page !== undefined;

    if (isPaginated) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skipNum = (pageNum - 1) * limitNum;

      const totalItems = await prisma.penyaluranSantunan.count({ where });
      const data = await prisma.penyaluranSantunan.findMany({
        where,
        skip: skipNum,
        take: limitNum,
        include: {
          mustahiq: true,
          kelompok: true
        },
        orderBy: {
          mustahiq: {
            nama_lengkap: 'asc'
          }
        }
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
      const data = await prisma.penyaluranSantunan.findMany({
        where,
        include: {
          mustahiq: true,
          kelompok: true
        },
        orderBy: {
          mustahiq: {
            nama_lengkap: 'asc'
          }
        }
      });

      res.json({ success: true, data, stats });
    }
  } catch (error) {
    console.error('[GET Penyaluran Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/program/:programId/penyaluran/generate-kelompok
router.post('/:programId/penyaluran/generate-kelompok', async (req, res) => {
  try {
    const { programId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { kelompokId, jumlahDiterima } = req.body;
    if (!kelompokId || !jumlahDiterima) {
      return res.status(400).json({ success: false, error: 'kelompokId and jumlahDiterima are required.' });
    }

    // 1. Get all active mustahiqs in the group
    const anggotaData = await prisma.anggotaKelompok.findMany({
      where: {
        kelompok_id: kelompokId,
        tenant_id: tenantId
      },
      include: {
        mustahiq: true
      }
    });
    
    const mustahiqs = (anggotaData || []).map(row => row.mustahiq).filter(Boolean);
    if (mustahiqs.length === 0) {
      return res.status(400).json({ success: false, error: 'Kelompok tidak memiliki anggota.' });
    }

    // 2. Map into distribution records
    const payloads = mustahiqs.map(m => ({
      tenant_id: tenantId,
      program_id: programId,
      mustahiq_id: m.id,
      kelompok_id: kelompokId,
      jumlah_diterima: jumlahDiterima,
      status: 'BELUM'
    }));

    // 3. Upsert records one by one for cross-database (SQLite & PostgreSQL) compatibility
    let count = 0;
    for (const p of payloads) {
      await prisma.penyaluranSantunan.upsert({
        where: {
          program_id_mustahiq_id: {
            program_id: p.program_id,
            mustahiq_id: p.mustahiq_id
          }
        },
        update: {}, // Do nothing if it already exists
        create: p
      });
      count++;
    }
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('[POST Generate Penyaluran Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/program/penyaluran/:penyaluranId
router.put('/penyaluran/:penyaluranId', async (req, res) => {
  try {
    const { penyaluranId } = req.params;
    const { status, buktiUrl, petugasId } = req.body;

    if (!['BELUM', 'TERSALURKAN', 'BATAL'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value.' });
    }

    const data = await prisma.penyaluranSantunan.update({
      where: { id: penyaluranId },
      data: {
        status,
        tanggal_penyerahan: status === 'TERSALURKAN' ? new Date() : null,
        bukti_penyerahan_url: buktiUrl !== undefined ? buktiUrl : undefined,
        petugas_id: petugasId !== undefined ? petugasId : undefined
      }
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[PUT Update Status Penyaluran Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/program/:programId/spj-pdf
router.get('/:programId/spj-pdf', async (req, res) => {
  try {
    const { programId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="SPJ-${programId}.pdf"`);

    await PdfGenerator.generateSpjPdf(programId, tenantId, res);
  } catch (error) {
    console.error('[SPJ PDF Generation Route Error]', error);
    // If headers are already sent, we just end response, otherwise send json
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// POST /api/v1/program/:programId/penyaluran/add-single
router.post('/:programId/penyaluran/add-single', async (req, res) => {
  try {
    const { programId } = req.params;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { mustahiqId, jumlahDiterima } = req.body;
    if (!mustahiqId || !jumlahDiterima) {
      return res.status(400).json({ success: false, error: 'mustahiqId and jumlahDiterima are required.' });
    }

    const data = await prisma.penyaluranSantunan.upsert({
      where: {
        program_id_mustahiq_id: {
          program_id: programId,
          mustahiq_id: mustahiqId
        }
      },
      update: {
        jumlah_diterima: jumlahDiterima,
        status: 'BELUM'
      },
      create: {
        tenant_id: tenantId,
        program_id: programId,
        mustahiq_id: mustahiqId,
        jumlah_diterima: jumlahDiterima,
        status: 'BELUM'
      }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[POST Add Single Penyaluran Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/program/penyaluran/:penyaluranId
router.delete('/penyaluran/:penyaluranId', async (req, res) => {
  try {
    const { penyaluranId } = req.params;
    await prisma.penyaluranSantunan.delete({
      where: { id: penyaluranId }
    });
    res.json({ success: true, message: 'Penyaluran record deleted successfully.' });
  } catch (error) {
    console.error('[DELETE Penyaluran Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

