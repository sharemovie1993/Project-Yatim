const PDFDocument = require('pdfkit');
const prisma = require('../prisma');
const path = require('path');
const fs = require('fs');

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

    const schoolName = tenant.name || 'Madrasah Uji Coba';
    const address = settings.address || 'Jl. Raya Pendidikan No. 123';
    const kepalaSekolah = settings.kepala_sekolah || 'Ahmad Dahlan, M.Pd';
    const bendahara = settings.bendahara || 'Siti Aminah, S.Pd';

    // 2. Initialize PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

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
      doc.image(logoPath, 50, 45, { width: 55, height: 55 });
      doc.fontSize(14).text(schoolName.toUpperCase(), 120, 45, { bold: true });
      doc.fontSize(9).text(address, 120, 62);

      let contactInfo = [];
      if (settings.phone_number) contactInfo.push(`Telp: ${settings.phone_number}`);
      if (settings.email) contactInfo.push(`Email: ${settings.email}`);
      if (settings.npwp) contactInfo.push(`NPWP: ${settings.npwp}`);

      if (contactInfo.length > 0) {
        doc.fontSize(8).text(contactInfo.join(' | '), 120, 76);
      }
    } else {
      // Fallback: Text only centered layout
      doc.fontSize(16).text(schoolName.toUpperCase(), { align: 'center', bold: true });
      doc.fontSize(10).text(address, { align: 'center' });

      let contactInfo = [];
      if (settings.phone_number) contactInfo.push(`Telp: ${settings.phone_number}`);
      if (settings.email) contactInfo.push(`Email: ${settings.email}`);
      if (settings.npwp) contactInfo.push(`NPWP: ${settings.npwp}`);

      if (contactInfo.length > 0) {
        doc.fontSize(8).text(contactInfo.join(' | '), { align: 'center' });
      }
    }

    // Divider Line (Double lines: thick and thin)
    const headerBottom = logoPath ? 110 : (doc.y > 100 ? doc.y : 100);
    doc.moveTo(50, headerBottom).lineTo(545, headerBottom).lineWidth(2).stroke();
    doc.moveTo(50, headerBottom + 3).lineTo(545, headerBottom + 3).lineWidth(0.5).stroke();
    
    // Set current y below the header divider
    doc.y = headerBottom + 15;

    // Title
    doc.fontSize(14).text('LAPORAN PERTANGGUNGJAWABAN (SPJ) SANTUNAN', { align: 'center', bold: true });
    doc.fontSize(12).text(`Program: ${program.nama_program}`, { align: 'center' });
    doc.fontSize(10).text(`Tanggal Pelaksanaan: ${program.tanggal_pelaksanaan}`, { align: 'center' });
    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).text('No', 50, tableTop, { bold: true });
    doc.text('Nama Lengkap', 80, tableTop, { bold: true });
    doc.text('Umur', 220, tableTop, { bold: true });
    doc.text('Kategori', 270, tableTop, { bold: true });
    doc.text('Jumlah Diterima', 360, tableTop, { bold: true });
    doc.text('Status', 470, tableTop, { bold: true });

    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    // Table Rows
    let currentY = tableTop + 20;
    let index = 1;
    let totalDana = 0;

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
      return `${age} th`;
    };

    for (const p of penyaluran) {
      // Prevent overflow
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc.text(index.toString(), 50, currentY);
      doc.text(p.mustahiq?.nama_lengkap || 'Tanpa Nama', 80, currentY);
      doc.text(calculateAge(p.mustahiq?.tanggal_lahir), 220, currentY);
      doc.text(p.mustahiq?.kategori || 'UMUM', 270, currentY);
      doc.text(p.jumlah_diterima, 360, currentY);
      doc.text(p.status, 470, currentY);

      // Simple number parsing for totaling
      const numericAmount = parseInt(p.jumlah_diterima.replace(/[^0-9]/g, ''), 10) || 0;
      totalDana += numericAmount;

      currentY += 20;
      index++;
    }

    doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
    currentY += 10;

    // Total Row
    doc.fontSize(11).text('TOTAL PENYALURAN DANA:', 80, currentY, { bold: true });
    doc.text(`Rp ${totalDana.toLocaleString('id-ID')}`, 360, currentY, { bold: true });

    currentY += 40;

    // Signatures
    if (currentY > 660) {
      doc.addPage();
      currentY = 50;
    }

    doc.fontSize(10);
    const signatureY = currentY + 15;

    // Date
    const kota = settings.kota || 'Purwakarta';
    const dateStr = `${kota}, ${program.tanggal_pelaksanaan}`;
    doc.text(dateStr, 380, currentY, { align: 'left' });
    
    // Headmaster Signature
    doc.text('Mengetahui,', 50, signatureY);
    doc.text('Kepala Sekolah', 50, signatureY + 15);
    doc.text(kepalaSekolah, 50, signatureY + 80, { underline: true, bold: true });

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
      doc.image(stempelPath, 85, signatureY + 20, { width: 70, height: 70 });
    }

    // Treasurer Signature
    doc.text('Dibuat oleh,', 380, signatureY);
    doc.text('Bendahara', 380, signatureY + 15);
    doc.text(bendahara, 380, signatureY + 80, { underline: true, bold: true });

    // End Document
    doc.end();
  }
}

module.exports = PdfGenerator;
