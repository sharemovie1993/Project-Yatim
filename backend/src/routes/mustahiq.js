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
    if (mustahiqData.nik === '' || mustahiqData.nik === undefined || mustahiqData.nik === null) {
      mustahiqData.nik = null;
    } else {
      mustahiqData.nik = String(mustahiqData.nik).trim();
      if (mustahiqData.nik === '') mustahiqData.nik = null;
    }
    
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

    const dataWithTenant = payloads.map(p => {
      let nik = p.nik;
      if (nik === '' || nik === undefined || nik === null) {
        nik = null;
      } else {
        nik = String(nik).trim();
        if (nik === '') nik = null;
      }
      return {
        ...p,
        nik,
        tenant_id: tenantId
      };
    });

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
    if (updates.nik === '' || updates.nik === undefined || updates.nik === null) {
      updates.nik = null;
    } else {
      updates.nik = String(updates.nik).trim();
      if (updates.nik === '') updates.nik = null;
    }

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

// GET /api/v1/mustahiq/template
router.get('/template', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Impor Mustahiq');

    // Title Block
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'TEMPLATE IMPORT DATA MUSTAHIQ - PORTAL MUSTAHIQ CARE';
    titleCell.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: 'FF065F46' } }; // Dark green
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light emerald
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 40;

    // Instructions Block
    worksheet.mergeCells('A2:K2');
    const instrCell = worksheet.getCell('A2');
    instrCell.value = 'PETUNJUK PENGISIAN: 1. Jangan mengubah susunan atau nama kolom di baris 4. | 2. Kolom dengan tanda (*) wajib diisi. | 3. NIK harus 16 digit (tulis sebagai teks agar tidak berubah). | 4. Jenis Kelamin diisi L (Laki-laki) atau P (Perempuan). | 5. Status diisi: AKTIF, SURVEY, atau TIDAK_AKTIF.';
    instrCell.font = { name: 'Segoe UI', italic: true, size: 9, color: { argb: 'FF92400E' } }; // Brownish orange
    instrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }; // Light amber
    instrCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    worksheet.getRow(2).height = 30;

    // Row 3 is empty
    worksheet.getRow(3).height = 15;

    // Header Row (Row 4)
    const headerRow = worksheet.addRow([
      'NIK', 
      'Nama Lengkap *', 
      'Kategori *', 
      'Jenis Kelamin (L/P)', 
      'Tanggal Lahir (YYYY-MM-DD)', 
      'Alamat Lengkap *', 
      'No Telepon', 
      'Nama Wali / Kerabat', 
      'Orang Tua Asuh', 
      'Status (AKTIF/SURVEY/TIDAK_AKTIF)', 
      'Catatan'
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // Emerald green
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    // Formatting NIK (Col 1) and Telepon (Col 7) as Text
    worksheet.getColumn(1).numFmt = '@';
    worksheet.getColumn(7).numFmt = '@';

    // Example Row 1 (Row 5)
    const ex1 = worksheet.addRow([
      '3201011234567890',
      'Budi Santoso',
      'YATIM',
      'L',
      '2015-08-17',
      'Jl. Melati No. 12, RT 02/03',
      '08123456789',
      'Siti Aminah',
      'Yayasan Amal',
      'SURVEY',
      'Anak yatim berprestasi'
    ]);
    ex1.height = 22;

    // Example Row 2 (Row 6)
    const ex2 = worksheet.addRow([
      '3201019876543210',
      'Aisyah Putri',
      'MISKIN',
      'P',
      '2014-04-12',
      'Kampung Baru, Desa Cerdas',
      '08771234567',
      'Ahmad Yani',
      '',
      'AKTIF',
      'Bantuan bulanan'
    ]);
    ex2.height = 22;

    // Apply borders and styling to example rows
    [ex1, ex2].forEach((row) => {
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
        // Alignments
        if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 7 || colNum === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // Auto-fit column width
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.row === 1 || cell.row === 2) return;
        const cellLen = cell.value ? String(cell.value).length : 0;
        if (cellLen > maxLen) {
          maxLen = cellLen;
        }
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_mustahiq.xlsx');
    
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error('[Template Mustahiq Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/mustahiq/export
router.get('/export', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const tenantName = tenant?.name || 'Sekolah/Yayasan';

    const data = await prisma.mustahiq.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nama_lengkap: 'asc' }
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Mustahiq');

    const calculateAge = (birthDateString) => {
      if (!birthDateString) return '-';
      const birthDate = new Date(birthDateString);
      if (isNaN(birthDate.getTime())) return '-';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} tahun`;
    };

    // Title Block
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `LAPORAN DATA PENERIMA MANFAAT (MUSTAHIQ) - ${tenantName.toUpperCase()}`;
    titleCell.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: 'FF065F46' } }; // Dark green
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light emerald
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 40;

    // Meta data Block
    worksheet.mergeCells('A2:L2');
    const metaCell = worksheet.getCell('A2');
    metaCell.value = `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} | Total Data: ${data.length} Mustahiq`;
    metaCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF374151' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 24;

    // Row 3 is empty
    worksheet.getRow(3).height = 15;

    // Header Row (Row 4)
    const headerRow = worksheet.addRow([
      'NIK', 
      'Nama Lengkap', 
      'Kategori', 
      'Jenis Kelamin', 
      'Tanggal Lahir', 
      'Umur',
      'Alamat Lengkap', 
      'No Telepon', 
      'Nama Wali / Kerabat', 
      'Orang Tua Asuh', 
      'Status', 
      'Catatan'
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // Emerald green
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    // Formatting NIK (Col 1) and Telepon (Col 8) as Text
    worksheet.getColumn(1).numFmt = '@';
    worksheet.getColumn(8).numFmt = '@';

    // Populate data
    data.forEach((m, index) => {
      const jkText = m.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : (m.jenis_kelamin === 'PEREMPUAN' ? 'Perempuan' : (m.jenis_kelamin || ''));
      const row = worksheet.addRow([
        m.nik || '',
        m.nama_lengkap,
        m.kategori,
        jkText,
        m.tanggal_lahir || '',
        calculateAge(m.tanggal_lahir),
        m.alamat_lengkap,
        m.no_telepon || '',
        m.nama_wali || '',
        m.orang_tua_asuh || '',
        m.status,
        m.catatan || ''
      ]);
      row.height = 22;

      const isEven = index % 2 === 1;
      const bgColor = isEven ? 'FFF9FAFB' : 'FFFFFFFF'; // Zebra striping

      row.eachCell((cell, colNum) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };

        // Formatting
        if (colNum === 1 || colNum === 8) {
          cell.numFmt = '@';
        }

        // Alignments
        if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 6 || colNum === 8 || colNum === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    // Auto column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.row === 1 || cell.row === 2) return;
        const cellLen = cell.value ? String(cell.value).length : 0;
        if (cellLen > maxLen) {
          maxLen = cellLen;
        }
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mustahiq_export.xlsx');
    
    const buffer = await workbook.xlsx.writeBuffer();
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

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    let headerRowIndex = 1;
    let headers = [];

    // Scan first 15 rows to find the header row
    for (let r = 1; r <= 15; r++) {
      const row = worksheet.getRow(r);
      const rowValues = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        rowValues.push(cell.value);
      });

      const hasNama = rowValues.some(val => val && typeof val === 'string' && (val.includes('Nama Lengkap') || val.includes('Nama')));
      const hasNIK = rowValues.some(val => val && typeof val === 'string' && val.includes('NIK'));

      if (hasNama || hasNIK) {
        headerRowIndex = r;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const val = cell.value ? String(cell.value).trim().replace(/\s*\*\s*$/, '') : '';
          headers[colNumber] = val;
        });
        break;
      }
    }

    // Default to Row 1 headers if scanning failed
    if (headers.length === 0) {
      const row = worksheet.getRow(1);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value ? String(cell.value).trim().replace(/\s*\*\s*$/, '') : '';
        headers[colNumber] = val;
      });
      headerRowIndex = 1;
    }

    const payloads = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;

      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          let cellVal = cell.value;
          // Clean cell value
          if (cellVal && typeof cellVal === 'object') {
            if (cellVal.richText) {
              cellVal = cellVal.richText.map(t => t.text).join('');
            } else if (cellVal.result !== undefined) {
              cellVal = cellVal.result;
            } else if (cellVal.text) {
              cellVal = cellVal.text;
            }
          }
          rowData[header] = cellVal;
        }
      });

      const rawNik = rowData['NIK'];
      const rawNama = rowData['Nama Lengkap'] || rowData['Nama'] || '';
      const rawKategori = rowData['Kategori'] || 'DHUAFA';
      const rawGender = rowData['Jenis Kelamin (L/P)'] || rowData['Jenis Kelamin'] || rowData['Gender'] || '';
      const rawTanggalLahir = rowData['Tanggal Lahir (YYYY-MM-DD)'] || rowData['Tanggal Lahir'] || '';
      const rawAlamat = rowData['Alamat Lengkap'] || rowData['Alamat'] || '';
      const rawTelepon = rowData['No Telepon'] || rowData['No. Telp'] || '';
      const rawWali = rowData['Nama Wali / Kerabat'] || rowData['Nama Wali'] || '';
      const rawAsuh = rowData['Orang Tua Asuh'] || '';
      const rawStatus = rowData['Status (AKTIF/SURVEY/TIDAK_AKTIF)'] || rowData['Status'] || 'SURVEY';
      const rawCatatan = rowData['Catatan'] || '';

      // Skip example rows in our template
      if (rawNama === 'Budi Santoso' || rawNama === 'Aisyah Putri') {
        return;
      }

      if (rawNama && rawAlamat) {
        let formattedDate = null;
        if (rawTanggalLahir) {
          if (rawTanggalLahir instanceof Date) {
            formattedDate = rawTanggalLahir.toISOString().slice(0, 10);
          } else {
            const dStr = String(rawTanggalLahir).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
              formattedDate = dStr;
            } else {
              const parsed = new Date(dStr);
              if (!isNaN(parsed.getTime())) {
                formattedDate = parsed.toISOString().slice(0, 10);
              }
            }
          }
        }

        let genderVal = 'LAKI_LAKI';
        const gClean = String(rawGender).trim().toUpperCase();
        if (gClean === 'P' || gClean === 'PEREMPUAN' || gClean === 'FEMALE') {
          genderVal = 'PEREMPUAN';
        } else if (gClean === 'L' || gClean === 'LAKI-LAKI' || gClean === 'LAKI_LAKI' || gClean === 'MALE' || gClean === 'LAKI LAKI') {
          genderVal = 'LAKI_LAKI';
        }

        let statusVal = 'SURVEY';
        const sClean = String(rawStatus).trim().toUpperCase().replace(' ', '_');
        if (sClean === 'AKTIF' || sClean === 'ACTIVE') {
          statusVal = 'AKTIF';
        } else if (sClean === 'TIDAK_AKTIF' || sClean === 'INACTIVE' || sClean === 'NON_AKTIF' || sClean === 'TIDAK AKTIF') {
          statusVal = 'TIDAK_AKTIF';
        } else if (sClean === 'SURVEY' || sClean === 'SURVEI') {
          statusVal = 'SURVEY';
        }

        let parsedNik = null;
        if (rawNik) {
          const trimmedNik = String(rawNik).trim();
          if (trimmedNik !== '') {
            parsedNik = trimmedNik;
          }
        }

        payloads.push({
          nik: parsedNik,
          nama_lengkap: String(rawNama).trim(),
          kategori: String(rawKategori).trim().toUpperCase(),
          jenis_kelamin: genderVal,
          tanggal_lahir: formattedDate,
          alamat_lengkap: String(rawAlamat).trim(),
          no_telepon: rawTelepon ? String(rawTelepon).trim() : null,
          nama_wali: rawWali ? String(rawWali).trim() : null,
          orang_tua_asuh: rawAsuh ? String(rawAsuh).trim() : null,
          status: statusVal,
          catatan: rawCatatan ? String(rawCatatan).trim() : null
        });
      }
    });

    if (payloads.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data valid yang bisa diimpor dari Excel.' });
    }

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

