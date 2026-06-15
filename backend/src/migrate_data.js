const { createClient } = require('@supabase/supabase-js');
const prisma = require('./prisma');

// Supabase credentials (from previous config)
const supabaseUrl = 'https://rzzwkqilszliwmxknptf.supabase.co';
const supabaseAnonKey = 'sb_publishable_OtEEiwC8pOpQl3tLr85sNQ_Klxl31fq';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateData() {
  console.log('=== STARTING DATA MIGRATION FROM SUPABASE TO SQLITE ===');

  try {
    // 1. Fetch and Migrate Tenants
    console.log('[1/6] Migrating Tenants...');
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('*');
    if (tErr) throw tErr;
    
    for (const t of tenants) {
      await prisma.tenant.upsert({
        where: { id: t.id },
        update: {
          name: t.name,
          domain_or_slug: t.domain_or_slug,
          license_key: t.license_key,
          is_active: t.is_active,
          settings: JSON.stringify(t.settings || {}),
          created_at: new Date(t.created_at)
        },
        create: {
          id: t.id,
          name: t.name,
          domain_or_slug: t.domain_or_slug,
          license_key: t.license_key,
          is_active: t.is_active,
          settings: JSON.stringify(t.settings || {}),
          created_at: new Date(t.created_at)
        }
      });
    }
    console.log(`✓ Migrated ${tenants.length} tenants.`);

    // 2. Fetch and Migrate Kategori
    console.log('\n[2/6] Migrating Kategori...');
    const { data: kategori, error: kErr } = await supabase.from('kategori').select('*');
    if (kErr) throw kErr;

    for (const k of kategori) {
      // Check if already exists to prevent duplicate key errors
      const exists = await prisma.kategori.findUnique({ where: { id: k.id } });
      if (!exists) {
        await prisma.kategori.create({
          data: {
            id: k.id,
            tenant_id: k.tenant_id,
            nama_kategori: k.nama_kategori,
            keterangan: k.keterangan,
            created_at: new Date(k.created_at)
          }
        });
      }
    }
    console.log(`✓ Migrated ${kategori.length} categories.`);

    // 3. Fetch and Migrate Kelompok
    console.log('\n[3/6] Migrating Kelompok...');
    const { data: kelompok, error: klErr } = await supabase.from('kelompok').select('*');
    if (klErr) throw klErr;

    for (const kl of kelompok) {
      await prisma.kelompok.upsert({
        where: { id: kl.id },
        update: {
          nama_kelompok: kl.nama_kelompok,
          keterangan: kl.keterangan,
          wilayah: kl.wilayah,
          created_at: new Date(kl.created_at)
        },
        create: {
          id: kl.id,
          tenant_id: kl.tenant_id,
          nama_kelompok: kl.nama_kelompok,
          keterangan: kl.keterangan,
          wilayah: kl.wilayah,
          created_at: new Date(kl.created_at)
        }
      });
    }
    console.log(`✓ Migrated ${kelompok.length} kelompok.`);

    // 4. Fetch and Migrate Mustahiq
    console.log('\n[4/6] Migrating Mustahiq...');
    const { data: mustahiqs, error: mErr } = await supabase.from('mustahiq').select('*');
    if (mErr) throw mErr;

    for (const m of mustahiqs) {
      await prisma.mustahiq.upsert({
        where: { id: m.id },
        update: {
          nik: m.nik,
          nama_lengkap: m.nama_lengkap,
          kategori: m.kategori,
          jenis_kelamin: m.jenis_kelamin,
          tanggal_lahir: m.tanggal_lahir,
          alamat_lengkap: m.alamat_lengkap,
          no_telepon: m.no_telepon,
          nama_wali: m.nama_wali,
          orang_tua_asuh: m.orang_tua_asuh,
          status: m.status,
          catatan: m.catatan,
          created_at: new Date(m.created_at)
        },
        create: {
          id: m.id,
          tenant_id: m.tenant_id,
          nik: m.nik,
          nama_lengkap: m.nama_lengkap,
          kategori: m.kategori,
          jenis_kelamin: m.jenis_kelamin,
          tanggal_lahir: m.tanggal_lahir,
          alamat_lengkap: m.alamat_lengkap,
          no_telepon: m.no_telepon,
          nama_wali: m.nama_wali,
          orang_tua_asuh: m.orang_tua_asuh,
          status: m.status,
          catatan: m.catatan,
          created_at: new Date(m.created_at)
        }
      });
    }
    console.log(`✓ Migrated ${mustahiqs.length} mustahiqs.`);

    // 5. Fetch and Migrate Anggota Kelompok
    console.log('\n[5/6] Migrating Anggota Kelompok...');
    const { data: anggota, error: aErr } = await supabase.from('anggota_kelompok').select('*');
    if (aErr) throw aErr;

    for (const a of anggota) {
      const exists = await prisma.anggotaKelompok.findUnique({
        where: {
          kelompok_id_mustahiq_id: {
            kelompok_id: a.kelompok_id,
            mustahiq_id: a.mustahiq_id
          }
        }
      });
      if (!exists) {
        await prisma.anggotaKelompok.create({
          data: {
            id: a.id,
            tenant_id: a.tenant_id,
            kelompok_id: a.kelompok_id,
            mustahiq_id: a.mustahiq_id,
            tanggal_bergabung: new Date(a.tanggal_bergabung)
          }
        });
      }
    }
    console.log(`✓ Migrated ${anggota.length} members relation.`);

    // 6. Fetch and Migrate Program & Penyaluran Santunan
    console.log('\n[6/6] Migrating Program & Penyaluran Santunan...');
    const { data: program, error: pErr } = await supabase.from('program_santunan').select('*');
    if (pErr) throw pErr;

    for (const pr of program) {
      await prisma.programSantunan.upsert({
        where: { id: pr.id },
        update: {
          nama_program: pr.nama_program,
          tanggal_pelaksanaan: pr.tanggal_pelaksanaan,
          jenis: pr.jenis,
          total_anggaran: pr.total_anggaran ? parseFloat(pr.total_anggaran) : 0.0,
          status: pr.status,
          created_at: new Date(pr.created_at)
        },
        create: {
          id: pr.id,
          tenant_id: pr.tenant_id,
          nama_program: pr.nama_program,
          tanggal_pelaksanaan: pr.tanggal_pelaksanaan,
          jenis: pr.jenis,
          total_anggaran: pr.total_anggaran ? parseFloat(pr.total_anggaran) : 0.0,
          status: pr.status,
          created_at: new Date(pr.created_at)
        }
      });
    }

    const { data: penyaluran, error: pyErr } = await supabase.from('penyaluran_santunan').select('*');
    if (pyErr) throw pyErr;

    for (const py of penyaluran) {
      const exists = await prisma.penyaluranSantunan.findUnique({
        where: {
          program_id_mustahiq_id: {
            program_id: py.program_id,
            mustahiq_id: py.mustahiq_id
          }
        }
      });
      if (!exists) {
        await prisma.penyaluranSantunan.create({
          data: {
            id: py.id,
            tenant_id: py.tenant_id,
            program_id: py.program_id,
            mustahiq_id: py.mustahiq_id,
            kelompok_id: py.kelompok_id,
            jumlah_diterima: py.jumlah_diterima,
            status: py.status,
            tanggal_penyerahan: py.tanggal_penyerahan ? new Date(py.tanggal_penyerahan) : null,
            bukti_penyerahan_url: py.bukti_penyerahan_url,
            petugas_id: py.petugas_id,
            created_at: new Date(py.created_at)
          }
        });
      }
    }
    console.log(`✓ Migrated ${program.length} programs and ${penyaluran.length} penyaluran records.`);

    console.log('\n=== DATA MIGRATION COMPLETED SUCCESSFULLY (Supabase -> SQLite) ===');
  } catch (err) {
    console.error('\n❌ DATA MIGRATION FAILED:', err.message);
  }
}

migrateData();
