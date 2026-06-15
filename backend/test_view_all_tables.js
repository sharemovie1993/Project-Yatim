const prisma = require('./src/prisma');

async function testViewAllTables() {
  console.log('=== MEMULAI PENGECEKAN DATA SEMUA TABEL DI SQLITE ===\n');

  try {
    // 1. Tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`[1] TABEL TENANTS (Total: ${tenants.length} record)`);
    tenants.forEach(t => {
      console.log(`    - ID: ${t.id} | Nama: ${t.name} | Slug: ${t.domain_or_slug}`);
    });

    // 2. Kategori
    const kategori = await prisma.kategori.findMany();
    console.log(`\n[2] TABEL KATEGORI (Total: ${kategori.length} record)`);
    kategori.slice(0, 5).forEach(k => {
      console.log(`    - Nama: ${k.nama_kategori} | Keterangan: ${k.keterangan || '-'}`);
    });
    if (kategori.length > 5) console.log(`    ... dan ${kategori.length - 5} kategori lainnya.`);

    // 3. Kelompok
    const kelompok = await prisma.kelompok.findMany();
    console.log(`\n[3] TABEL KELOMPOK (Total: ${kelompok.length} record)`);
    kelompok.forEach(kl => {
      console.log(`    - Nama Kelompok: ${kl.nama_kelompok} | Wilayah: ${kl.wilayah || '-'}`);
    });

    // 4. Mustahiq
    const mustahiqs = await prisma.mustahiq.findMany();
    console.log(`\n[4] TABEL MUSTAHIQ (Total: ${mustahiqs.length} record)`);
    mustahiqs.slice(0, 5).forEach(m => {
      console.log(`    - NIK: ${m.nik || '-'} | Nama: ${m.nama_lengkap} | Kategori: ${m.kategori} | Status: ${m.status}`);
    });
    if (mustahiqs.length > 5) console.log(`    ... dan ${mustahiqs.length - 5} mustahiq lainnya.`);

    // 5. Anggota Kelompok
    const anggota = await prisma.anggotaKelompok.findMany({
      include: {
        kelompok: true,
        mustahiq: true
      }
    });
    console.log(`\n[5] TABEL ANGGOTA KELOMPOK (Total: ${anggota.length} record)`);
    anggota.slice(0, 5).forEach(a => {
      console.log(`    - Kelompok: ${a.kelompok?.nama_kelompok} <-> Anggota: ${a.mustahiq?.nama_lengkap}`);
    });
    if (anggota.length > 5) console.log(`    ... dan ${anggota.length - 5} relasi anggota lainnya.`);

    // 6. Program Santunan
    const program = await prisma.programSantunan.findMany();
    console.log(`\n[6] TABEL PROGRAM SANTUNAN (Total: ${program.length} record)`);
    program.forEach(p => {
      console.log(`    - Program: ${p.nama_program} | Jenis: ${p.jenis} | Anggaran: Rp ${p.total_anggaran.toLocaleString('id-ID')} | Status: ${p.status}`);
    });

    // 7. Penyaluran Santunan
    const penyaluran = await prisma.penyaluranSantunan.findMany({
      include: {
        program: true,
        mustahiq: true
      }
    });
    console.log(`\n[7] TABEL PENYALURAN SANTUNAN (Total: ${penyaluran.length} record)`);
    penyaluran.slice(0, 5).forEach(py => {
      console.log(`    - Program: ${py.program?.nama_program} | Penerima: ${py.mustahiq?.nama_lengkap} | Jumlah: ${py.jumlah_diterima} | Status: ${py.status}`);
    });
    if (penyaluran.length > 5) console.log(`    ... dan ${penyaluran.length - 5} data penyaluran lainnya.`);

    console.log('\n=== SELESAI PENGECEKAN DATA ===');
  } catch (err) {
    console.error('\n❌ GAGAL MEMBACA DATABASE:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testViewAllTables();
