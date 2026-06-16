const PDFDocument = require('pdfkit');
const prisma = require('../prisma');
const path = require('path');
const fs = require('fs');

function terbilang(angka) {
  const bil = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let temp = "";
  if (angka < 12) {
    temp = " " + bil[angka];
  } else if (angka < 20) {
    temp = terbilang(angka - 10) + " belas";
  } else if (angka < 100) {
    temp = terbilang(Math.floor(angka / 10)) + " puluh" + terbilang(angka % 10);
  } else if (angka < 200) {
    temp = " seratus" + terbilang(angka - 100);
  } else if (angka < 1000) {
    temp = terbilang(Math.floor(angka / 100)) + " ratus" + terbilang(angka % 100);
  } else if (angka < 2000) {
    temp = " seribu" + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    temp = terbilang(Math.floor(angka / 1000)) + " ribu" + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    temp = terbilang(Math.floor(angka / 1000000)) + " juta" + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    temp = terbilang(Math.floor(angka / 1000000000)) + " milyar" + terbilang(angka % 1000000000);
  }
  return temp;
}

function formatTerbilang(angka) {
  if (angka === 0) return "Nol Rupiah";
  const hasil = terbilang(angka).trim();
  return hasil.charAt(0).toUpperCase() + hasil.slice(1) + " Rupiah";
}

class PdfGenerator {
  static async generateSpjPdf(programId, tenantId, res) {
    // 1. Fetch Program, Tenant, and Penyaluran Data
    const program = await prisma.programSantunan.findUnique({
      where: { id: programId }
    });
    if (!program) throw new Error('Program not found');

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    if (!tenant) throw new Error('Tenant not found');

    const penyaluran = await prisma.penyaluranSantunan.findMany({
      where: { program_id: programId, tenant_id: tenantId },
      include: { mustahiq: true }
    });

    let settings = {};
    try {
      settings = JSON.parse(tenant.settings || '{}');
    } catch (e) {
      settings = {};
    }

    const schoolName = tenant.name || '...........................................';
    const address = settings.address || '......................................................................';
    const kepalaSekolah = settings.kepala_sekolah || '...........................................';
    const bendahara = settings.bendahara || '...........................................';
    const kopParent = settings.kop_parent || '';
    const jabatanPimpinan = settings.jabatan_pimpinan || 'Kepala Sekolah';
    const nipPimpinan = settings.nip_pimpinan || '';
    const jabatanBendahara = settings.jabatan_bendahara || 'Bendahara';
    const nipBendahara = settings.nip_bendahara || '';

    // 2. Initialize PDF Document (margins: 40 on each side)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Stream the PDF directly to the Express response
    doc.pipe(res);

    // Check if logo is uploaded and exists locally
    let logoPath = null;
    if (settings.logo_url && settings.logo_url.startsWith('/api/uploads/')) {
      const filename = settings.logo_url.replace('/api/uploads/', '');
      const pathToCheck = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(pathToCheck)) {
        logoPath = pathToCheck;
      }
    }

    // Header drawing
    if (logoPath) {
      // Draw logo on the left, details on the right
      doc.image(logoPath, 40, 35, { width: 55, height: 55 });
      
      let currentHeaderY = 35;
      if (kopParent) {
        doc.fontSize(9.5).font('Helvetica-Bold').text(kopParent.toUpperCase(), 110, currentHeaderY);
        currentHeaderY += 13;
      }
      doc.fontSize(13.5).font('Helvetica-Bold').text(schoolName.toUpperCase(), 110, currentHeaderY);
      doc.fontSize(8.5).font('Helvetica').text(address, 110, currentHeaderY + 16);

      let contactInfo = [];
      if (settings.phone_number) contactInfo.push(`Telp: ${settings.phone_number}`);
      if (settings.email) contactInfo.push(`Email: ${settings.email}`);
      if (settings.npwp) contactInfo.push(`NPWP: ${settings.npwp}`);

      if (contactInfo.length > 0) {
        doc.fontSize(8).text(contactInfo.join(' | '), 110, currentHeaderY + 27);
      }
    } else {
      // Fallback: Text only centered layout
      let currentHeaderY = 35;
      if (kopParent) {
        doc.fontSize(10).font('Helvetica-Bold').text(kopParent.toUpperCase(), { align: 'center' });
        currentHeaderY += 13;
      }
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName.toUpperCase(), { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(address, { align: 'center' });

      let contactInfo = [];
      if (settings.phone_number) contactInfo.push(`Telp: ${settings.phone_number}`);
      if (settings.email) contactInfo.push(`Email: ${settings.email}`);
      if (settings.npwp) contactInfo.push(`NPWP: ${settings.npwp}`);

      if (contactInfo.length > 0) {
        doc.fontSize(8).text(contactInfo.join(' | '), { align: 'center' });
      }
    }

    // Divider Line (Double lines: thick and thin)
    const headerBottom = logoPath ? 98 : (doc.y > 90 ? doc.y : 90);
    doc.moveTo(40, headerBottom).lineTo(555, headerBottom).lineWidth(2.5).stroke();
    doc.moveTo(40, headerBottom + 3).lineTo(555, headerBottom + 3).lineWidth(0.8).stroke();
    
    // Set current y below the header divider
    doc.y = headerBottom + 12;

    // Title
    doc.fontSize(11).font('Helvetica-Bold').text('SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(`Nomor: 003/SPJ-${program.id.split('-')[0].toUpperCase()}/${new Date(program.tanggal_pelaksanaan || Date.now()).getFullYear()}`, { align: 'center' });
    doc.moveDown(0.8);

    // Calculate total amount
    let totalDana = 0;
    for (const p of penyaluran) {
      const numericAmount = parseInt(p.jumlah_diterima.replace(/[^0-9]/g, ''), 10) || 0;
      totalDana += numericAmount;
    }

    // Declaring statement paragraph
    const declaringText = `Yang bertanda tangan di bawah ini Pimpinan ${schoolName} menyatakan bertanggung jawab penuh atas penyaluran dana bantuan sosial dalam program "${program.nama_program}" yang dilaksanakan pada tanggal ${program.tanggal_pelaksanaan}, dengan total penyaluran dana sebesar Rp ${totalDana.toLocaleString('id-ID')} (${formatTerbilang(totalDana)}). Rincian penerima bantuan adalah sebagai berikut:`;

    doc.fontSize(9.5).font('Helvetica').text(declaringText, { align: 'justify', lineGap: 3 });
    doc.moveDown(1.2);

    // Helper to draw vertical and horizontal cell borders
    const drawRowBorders = (yStart, yEnd) => {
      doc.lineJoin('miter').lineWidth(0.5).strokeColor('#000000');
      // Vertical borders
      doc.moveTo(40, yStart).lineTo(40, yEnd).stroke();
      doc.moveTo(70, yStart).lineTo(70, yEnd).stroke();
      doc.moveTo(210, yStart).lineTo(210, yEnd).stroke();
      doc.moveTo(305, yStart).lineTo(305, yEnd).stroke();
      doc.moveTo(380, yStart).lineTo(380, yEnd).stroke();
      doc.moveTo(465, yStart).lineTo(465, yEnd).stroke();
      doc.moveTo(555, yStart).lineTo(555, yEnd).stroke();
      // Horizontal border at the bottom
      doc.moveTo(40, yEnd).lineTo(555, yEnd).stroke();
    };

    // Table Header
    const tableTop = doc.y;
    doc.save();
    doc.fillColor('#e5e7eb').rect(40, tableTop, 515, 20).fill();
    doc.restore();

    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text('No', 42, tableTop + 6, { width: 26, align: 'center' });
    doc.text('Nama Lengkap Mustahiq', 74, tableTop + 6, { width: 132 });
    doc.text('Nomor NIK', 214, tableTop + 6, { width: 87 });
    doc.text('Kategori', 309, tableTop + 6, { width: 67 });
    doc.text('Jumlah Bantuan', 384, tableTop + 6, { width: 77, align: 'right' });
    doc.text('Tanda Terima', 469, tableTop + 6, { width: 82, align: 'center' });

    drawRowBorders(tableTop, tableTop + 20);

    // Table Rows
    let currentY = tableTop + 20;
    let index = 1;

    for (const p of penyaluran) {
      // Prevent overflow (bottom page limit)
      if (currentY > 740) {
        doc.addPage();
        currentY = 50;
        
        // Redraw Header on new page
        doc.save();
        doc.fillColor('#e5e7eb').rect(40, currentY, 515, 20).fill();
        doc.restore();

        doc.fontSize(8.5).font('Helvetica-Bold');
        doc.text('No', 42, currentY + 6, { width: 26, align: 'center' });
        doc.text('Nama Lengkap Mustahiq', 74, currentY + 6, { width: 132 });
        doc.text('Nomor NIK', 214, currentY + 6, { width: 87 });
        doc.text('Kategori', 309, currentY + 6, { width: 67 });
        doc.text('Jumlah Bantuan', 384, currentY + 6, { width: 77, align: 'right' });
        doc.text('Tanda Terima', 469, currentY + 6, { width: 82, align: 'center' });

        drawRowBorders(currentY, currentY + 20);
        currentY += 20;
      }

      doc.fontSize(8.5).font('Helvetica');
      doc.text(index.toString(), 42, currentY + 6, { width: 26, align: 'center' });
      doc.text(p.mustahiq?.nama_lengkap || 'Tanpa Nama', 74, currentY + 6, { width: 132 });
      doc.text(p.mustahiq?.nik || '-', 214, currentY + 6, { width: 87 });
      doc.text(p.mustahiq?.kategori || 'UMUM', 309, currentY + 6, { width: 67 });
      doc.text(p.jumlah_diterima, 384, currentY + 6, { width: 77, align: 'right' });

      // Receipt signatures selang-seling zig-zag
      const sigText = index % 2 !== 0 ? `${index}. .................` : `      ${index}. .................`;
      doc.fontSize(7.5).text(sigText, 472, currentY + 6, { width: 78 });

      drawRowBorders(currentY, currentY + 20);
      currentY += 20;
      index++;
    }

    // Total Row
    if (currentY > 740) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(8.5).font('Helvetica-Bold');
    doc.text('JUMLAH TOTAL PENYALURAN DANA', 74, currentY + 6, { width: 300 });
    doc.text(`Rp ${totalDana.toLocaleString('id-ID')}`, 384, currentY + 6, { width: 77, align: 'right' });

    // Draw custom borders for total row (merging columns 1-4, keeping amount and signature columns separate)
    doc.lineJoin('miter').lineWidth(0.5).strokeColor('#000000');
    doc.moveTo(40, currentY).lineTo(40, currentY + 20).stroke();
    doc.moveTo(380, currentY).lineTo(380, currentY + 20).stroke();
    doc.moveTo(465, currentY).lineTo(465, currentY + 20).stroke();
    doc.moveTo(555, currentY).lineTo(555, currentY + 20).stroke();
    doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).stroke();
    currentY += 25;

    // Spelled out words (Terbilang)
    doc.fontSize(8.5).font('Helvetica-Oblique').text(`Terbilang: "${formatTerbilang(totalDana)}"`, 40, currentY);
    currentY += 35;

    // Signatures
    if (currentY > 660) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(9.5).font('Helvetica');
    const signatureY = currentY + 15;

    // Date
    const kota = settings.kota || '...........................................';
    const dateStr = `${kota}, ${program.tanggal_pelaksanaan}`;
    doc.text(dateStr, 380, currentY, { align: 'left' });
    
    // Headmaster / Pimpinan Signature
    doc.text('Mengetahui,', 50, signatureY);
    doc.text(jabatanPimpinan, 50, signatureY + 15);
    doc.font('Helvetica-Bold').text(kepalaSekolah, 50, signatureY + 80, { underline: true });
    if (nipPimpinan) {
      doc.fontSize(8.5).font('Helvetica').text(`NIP/NIK. ${nipPimpinan}`, 50, signatureY + 95);
    }

    // Overlay Stempel image on Headmaster Signature area if it exists
    let stempelPath = null;
    if (settings.stempel_url && settings.stempel_url.startsWith('/api/uploads/')) {
      const filename = settings.stempel_url.replace('/api/uploads/', '');
      const pathToCheck = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(pathToCheck)) {
        stempelPath = pathToCheck;
      }
    }

    if (stempelPath) {
      doc.image(stempelPath, 85, signatureY + 25, { width: 65, height: 65 });
    }

    // Treasurer / Bendahara Signature
    doc.fontSize(9.5).font('Helvetica');
    doc.text('Dibuat oleh,', 380, signatureY);
    doc.text(jabatanBendahara, 380, signatureY + 15);
    doc.font('Helvetica-Bold').text(bendahara, 380, signatureY + 80, { underline: true });
    if (nipBendahara) {
      doc.fontSize(8.5).font('Helvetica').text(`NIP/NIK. ${nipBendahara}`, 380, signatureY + 95);
    }

    // End Document
    doc.end();
  }
}

module.exports = PdfGenerator;

