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

function formatDateIndonesian(dateString) {
  if (!dateString) return '...........................................';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    return dateString;
  }
  
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

function drawKopSurat(doc, logoPath, kopParent, schoolName, address, settings) {
  if (logoPath) {
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

  const headerBottom = logoPath ? 98 : (doc.y > 90 ? doc.y : 90);
  doc.moveTo(40, headerBottom).lineTo(555, headerBottom).lineWidth(2.5).stroke();
  doc.moveTo(40, headerBottom + 3).lineTo(555, headerBottom + 3).lineWidth(0.8).stroke();
  
  doc.y = headerBottom + 12;
  return doc.y;
}

function drawSignatureBlock(doc, yStart, settings, program, schoolName, kepalaSekolah, bendahara, jabatanPimpinan, nipPimpinan, jabatanBendahara, nipBendahara) {
  if (yStart > 660) {
    doc.addPage();
    yStart = 50;
  }

  doc.fontSize(9.5).font('Helvetica').fillColor('#000000');
  const signatureY = yStart + 15;

  const kota = settings.kota || '...........................................';
  const dateStr = `${kota}, ${formatDateIndonesian(program.tanggal_pelaksanaan)}`;
  doc.text(dateStr, 380, yStart, { align: 'left' });
  
  doc.text('Mengetahui,', 50, signatureY);
  doc.text(jabatanPimpinan, 50, signatureY + 15);
  doc.font('Helvetica-Bold').text(kepalaSekolah, 50, signatureY + 80, { underline: true });
  if (nipPimpinan) {
    doc.fontSize(8.5).font('Helvetica').text(`NIP/NIK. ${nipPimpinan}`, 50, signatureY + 95);
  }

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

  doc.fontSize(9.5).font('Helvetica');
  doc.text('Dibuat oleh,', 380, signatureY);
  doc.text(jabatanBendahara, 380, signatureY + 15);
  doc.font('Helvetica-Bold').text(bendahara, 380, signatureY + 80, { underline: true });
  if (nipBendahara) {
    doc.fontSize(8.5).font('Helvetica').text(`NIP/NIK. ${nipBendahara}`, 380, signatureY + 95);
  }
}

function drawRecipientTable(doc, tableTop, penyaluran, totalDana, formatTerbilang) {
  const drawRowBorders = (yStart, yEnd) => {
    doc.lineJoin('miter').lineWidth(0.5).strokeColor('#000000');
    doc.moveTo(40, yStart).lineTo(40, yEnd).stroke();
    doc.moveTo(70, yStart).lineTo(70, yEnd).stroke();
    doc.moveTo(210, yStart).lineTo(210, yEnd).stroke();
    doc.moveTo(305, yStart).lineTo(305, yEnd).stroke();
    doc.moveTo(380, yStart).lineTo(380, yEnd).stroke();
    doc.moveTo(465, yStart).lineTo(465, yEnd).stroke();
    doc.moveTo(555, yStart).lineTo(555, yEnd).stroke();
    doc.moveTo(40, yEnd).lineTo(555, yEnd).stroke();
  };

  const drawTableHeader = (y) => {
    doc.save();
    doc.fillColor('#e5e7eb').rect(40, y, 515, 20).fill();
    doc.restore();

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
    doc.text('No', 42, y + 6, { width: 26, align: 'center' });
    doc.text('Nama Lengkap Mustahiq', 74, y + 6, { width: 132 });
    doc.text('Nomor NIK', 214, y + 6, { width: 87 });
    doc.text('Kategori', 309, y + 6, { width: 67 });
    doc.text('Jumlah Bantuan', 384, y + 6, { width: 77, align: 'right' });
    doc.text('Tanda Terima', 469, y + 6, { width: 82, align: 'center' });

    drawRowBorders(y, y + 20);
  };

  drawTableHeader(tableTop);

  let currentY = tableTop + 20;
  let index = 1;

  for (const p of penyaluran) {
    if (currentY > 740) {
      doc.addPage();
      currentY = 50;
      drawTableHeader(currentY);
      currentY += 20;
    }

    doc.fontSize(8.5).font('Helvetica').fillColor('#000000');
    doc.text(index.toString(), 42, currentY + 6, { width: 26, align: 'center' });
    doc.text(p.mustahiq?.nama_lengkap || 'Tanpa Nama', 74, currentY + 6, { width: 132 });
    doc.text(p.mustahiq?.nik || '-', 214, currentY + 6, { width: 87 });
    doc.text(p.mustahiq?.kategori || 'UMUM', 309, currentY + 6, { width: 67 });
    doc.text(p.jumlah_diterima, 384, currentY + 6, { width: 77, align: 'right' });

    const sigText = index % 2 !== 0 ? `${index}. .................` : `      ${index}. .................`;
    doc.fontSize(7.5).text(sigText, 472, currentY + 6, { width: 78 });

    drawRowBorders(currentY, currentY + 20);
    currentY += 20;
    index++;
  }

  if (currentY > 740) {
    doc.addPage();
    currentY = 50;
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
  doc.text('JUMLAH TOTAL PENYALURAN DANA', 74, currentY + 6, { width: 300 });
  doc.text(`Rp ${totalDana.toLocaleString('id-ID')}`, 384, currentY + 6, { width: 77, align: 'right' });

  doc.lineJoin('miter').lineWidth(0.5).strokeColor('#000000');
  doc.moveTo(40, currentY).lineTo(40, currentY + 20).stroke();
  doc.moveTo(380, currentY).lineTo(380, currentY + 20).stroke();
  doc.moveTo(465, currentY).lineTo(465, currentY + 20).stroke();
  doc.moveTo(555, currentY).lineTo(555, currentY + 20).stroke();
  doc.moveTo(40, currentY + 20).lineTo(555, currentY + 20).stroke();
  currentY += 25;

  doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#000000').text(`Terbilang: "${formatTerbilang(totalDana)}"`, 40, currentY);
  currentY += 20;

  return currentY;
}

class PdfGenerator {
  static async generateSpjPdf(programId, tenantId, res) {
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

    // Override Content-Disposition to use formal document filename with date in "20_Nov_2026" style
    const cleanProgramName = program.nama_program.replace(/[^a-zA-Z0-9]/g, '_');
    const formattedExecDate = formatDateIndonesian(program.tanggal_pelaksanaan).replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="SPTB_Laporan_Pertanggungjawaban_Belanja_${cleanProgramName}_${formattedExecDate}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    let logoPath = null;
    if (settings.logo_url && settings.logo_url.startsWith('/api/uploads/')) {
      const filename = settings.logo_url.replace('/api/uploads/', '');
      const pathToCheck = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(pathToCheck)) {
        logoPath = pathToCheck;
      }
    }

    let totalDana = 0;
    for (const p of penyaluran) {
      const numericAmount = parseInt(p.jumlah_diterima.replace(/[^0-9]/g, ''), 10) || 0;
      totalDana += numericAmount;
    }

    const isTableSeparate = penyaluran.length > 3;

    if (isTableSeparate) {
      // PAGE 1: Formal SPTB Letter
      let currentY = drawKopSurat(doc, logoPath, kopParent, schoolName, address, settings);
      
      const sptbNo = `003/SPJ-${program.id.split('-')[0].toUpperCase()}/${new Date(program.tanggal_pelaksanaan || Date.now()).getFullYear()}`;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Nomor: ${sptbNo}`, { align: 'center' });
      doc.moveDown(1.2);
      currentY = doc.y;

      const declaringText = `Yang bertanda tangan di bawah ini Pimpinan ${schoolName} menyatakan bertanggung jawab penuh atas penyaluran dana bantuan sosial dalam program "${program.nama_program}" yang dilaksanakan pada tanggal ${formatDateIndonesian(program.tanggal_pelaksanaan)}, dengan total penyaluran dana sebesar Rp ${totalDana.toLocaleString('id-ID')} (${formatTerbilang(totalDana)}). Bukti-bukti pengeluaran dan rincian penerima bantuan sebagaimana terlampir merupakan bagian yang tidak terpisahkan dari Surat Pernyataan ini.`;

      doc.fontSize(9.5).font('Helvetica').text(declaringText, { align: 'justify', lineGap: 3.5 });
      doc.moveDown(2.0);
      currentY = doc.y;

      drawSignatureBlock(doc, currentY, settings, program, schoolName, kepalaSekolah, bendahara, jabatanPimpinan, nipPimpinan, jabatanBendahara, nipBendahara);

      // PAGE 2+: Attachment (Lampiran)
      doc.addPage();
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('LAMPIRAN SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Nomor: ${sptbNo}`, { align: 'center' });
      doc.fontSize(9.5).font('Helvetica-Bold').text(`Daftar Rincian Penerima Bantuan Program: "${program.nama_program}"`, { align: 'center' });
      doc.fontSize(8.5).font('Helvetica').text(`Tanggal Pelaksanaan: ${formatDateIndonesian(program.tanggal_pelaksanaan)} | Lembaga: ${schoolName}`, { align: 'center' });
      doc.moveDown(1.2);
      
      let tableTop = doc.y;
      currentY = drawRecipientTable(doc, tableTop, penyaluran, totalDana, formatTerbilang);
      
      drawSignatureBlock(doc, currentY + 15, settings, program, schoolName, kepalaSekolah, bendahara, jabatanPimpinan, nipPimpinan, jabatanBendahara, nipBendahara);
      
    } else {
      // PAGE 1: SPTB Letter and Table together (for short list)
      let currentY = drawKopSurat(doc, logoPath, kopParent, schoolName, address, settings);
      
      const sptbNo = `003/SPJ-${program.id.split('-')[0].toUpperCase()}/${new Date(program.tanggal_pelaksanaan || Date.now()).getFullYear()}`;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Nomor: ${sptbNo}`, { align: 'center' });
      doc.moveDown(1.2);
      currentY = doc.y;

      const declaringText = `Yang bertanda tangan di bawah ini Pimpinan ${schoolName} menyatakan bertanggung jawab penuh atas penyaluran dana bantuan sosial dalam program "${program.nama_program}" yang dilaksanakan pada tanggal ${formatDateIndonesian(program.tanggal_pelaksanaan)}, dengan total penyaluran dana sebesar Rp ${totalDana.toLocaleString('id-ID')} (${formatTerbilang(totalDana)}). Rincian penerima bantuan adalah sebagai berikut:`;

      doc.fontSize(9.5).font('Helvetica').text(declaringText, { align: 'justify', lineGap: 3.5 });
      doc.moveDown(1.5);
      
      let tableTop = doc.y;
      currentY = drawRecipientTable(doc, tableTop, penyaluran, totalDana, formatTerbilang);
      
      drawSignatureBlock(doc, currentY + 15, settings, program, schoolName, kepalaSekolah, bendahara, jabatanPimpinan, nipPimpinan, jabatanBendahara, nipBendahara);
    }

    doc.end();
  }
}

module.exports = PdfGenerator;
