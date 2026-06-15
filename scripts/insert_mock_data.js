const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rzzwkqilszliwmxknptf.supabase.co';
const supabaseAnonKey = 'sb_publishable_OtEEiwC8pOpQl3tLr85sNQ_Klxl31fq';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('=== MEMULAI PENYEMAIAN DATA DEMO ===');
  try {
    // 1. Get demo tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('domain_or_slug', 'demo')
      .single();

    if (tenantErr) throw tenantErr;
    const tenantId = tenant.id;
    console.log(`✓ Tenant ID demo: ${tenantId}`);

    // Clean old demo data to avoid duplication errors
    console.log('Membersihkan data lama...');
    await supabase.from('mustahiq').delete().eq('tenant_id', tenantId);
    await supabase.from('kelompok').delete().eq('tenant_id', tenantId);
    await supabase.from('program_santunan').delete().eq('tenant_id', tenantId);

    // 2. Insert Groups
    console.log('Membuat Kelompok Penerima...');
    const { data: groups, error: groupErr } = await supabase
      .from('kelompok')
      .insert([
        { tenant_id: tenantId, nama_kelompok: 'Kelompok A - Kemang', wilayah: 'Kemang Pratama', keterangan: 'Distribusi wilayah utara' },
        { tenant_id: tenantId, nama_kelompok: 'Kelompok B - Margonda', wilayah: 'Margonda Raya', keterangan: 'Distribusi wilayah selatan' }
      ])
      .select();

    if (groupErr) throw groupErr;
    console.log(`✓ Berhasil membuat ${groups.length} kelompok.`);

    // 3. Insert Mustahiqs
    console.log('Membuat Data Mustahiq...');
    const { data: mustahiqs, error: mustahiqErr } = await supabase
      .from('mustahiq')
      .insert([
        {
          tenant_id: tenantId,
          nama_lengkap: 'Achmad Fauzi',
          nik: '3275011212080001',
          kategori: 'YATIM',
          jenis_kelamin: 'LAKI_LAKI',
          tanggal_lahir: '2014-05-12',
          alamat_lengkap: 'Jl. Melati RT 03/04 Kemang',
          no_telepon: '081299990001',
          nama_wali: 'Fatimah (Ibu)',
          orang_tua_asuh: 'H. Rahmat',
          status: 'AKTIF',
          catatan: 'Yatim sejak usia 5 tahun, ibu bekerja serabutan.'
        },
        {
          tenant_id: tenantId,
          nama_lengkap: 'Siti Aminah',
          nik: '3275015509100002',
          kategori: 'PIATU',
          jenis_kelamin: 'PEREMPUAN',
          tanggal_lahir: '2012-09-15',
          alamat_lengkap: 'Gg. H. Najih No. 45 Kemang',
          no_telepon: '081299990002',
          nama_wali: 'Ridwan (Ayah)',
          orang_tua_asuh: 'Hj. Kartika',
          status: 'AKTIF',
          catatan: 'Piatu, ayah bekerja sebagai ojek online.'
        },
        {
          tenant_id: tenantId,
          nama_lengkap: 'Muhammad Rayhan',
          nik: '3275022103090003',
          kategori: 'YATIM_PIATU',
          jenis_kelamin: 'LAKI_LAKI',
          tanggal_lahir: '2010-03-21',
          alamat_lengkap: 'Panti Asuhan Margonda',
          no_telepon: '081299990003',
          nama_wali: 'Ust. Yusuf (Pengasuh)',
          orang_tua_asuh: 'H. Sulaiman',
          status: 'AKTIF',
          catatan: 'Yatim piatu, tinggal di panti asuhan mitra.'
        },
        {
          tenant_id: tenantId,
          nama_lengkap: 'Mbah Karto',
          nik: '3275020101450004',
          kategori: 'DHUAFA',
          jenis_kelamin: 'LAKI_LAKI',
          tanggal_lahir: '1945-01-01',
          alamat_lengkap: 'Kp. Rawa Indah RT 02/09 Margonda',
          no_telepon: null,
          nama_wali: 'Suhartini (Anak)',
          orang_tua_asuh: null,
          status: 'AKTIF',
          catatan: 'Lansia sebatang kara, hidup dari uluran tangan tetangga.'
        }
      ])
      .select();

    if (mustahiqErr) throw mustahiqErr;
    console.log(`✓ Berhasil membuat ${mustahiqs.length} mustahiq.`);

    // 4. Assign members to Groups
    console.log('Menghubungkan Mustahiq ke Kelompok...');
    const groupA = groups.find(g => g.nama_kelompok.includes('Kemang'));
    const groupB = groups.find(g => g.nama_kelompok.includes('Margonda'));

    const attachments = [
      { tenant_id: tenantId, kelompok_id: groupA.id, mustahiq_id: mustahiqs[0].id },
      { tenant_id: tenantId, kelompok_id: groupA.id, mustahiq_id: mustahiqs[1].id },
      { tenant_id: tenantId, kelompok_id: groupB.id, mustahiq_id: mustahiqs[2].id },
      { tenant_id: tenantId, kelompok_id: groupB.id, mustahiq_id: mustahiqs[3].id }
    ];

    const { error: junctionErr } = await supabase
      .from('anggota_kelompok')
      .insert(attachments);

    if (junctionErr) throw junctionErr;
    console.log('✓ Anggota kelompok berhasil dihubungkan.');

    // 5. Create Program Santunan
    console.log('Membuat Program Santunan...');
    const { data: program, error: progErr } = await supabase
      .from('program_santunan')
      .insert([
        {
          tenant_id: tenantId,
          nama_program: 'Santunan Ceria Ramadhan 1447H',
          tanggal_pelaksanaan: '2026-06-15',
          jenis: 'UANG_TUNAI',
          total_anggaran: 25000000.00,
          status: 'BERJALAN'
        }
      ])
      .select()
      .single();

    if (progErr) throw progErr;
    console.log(`✓ Program santunan berhasil dibuat: ${program.nama_program}`);

    // Generate Penyaluran records for Kelompok A
    console.log('Membuat data alokasi penyaluran...');
    const { error: distErr } = await supabase
      .from('penyaluran_santunan')
      .insert([
        {
          tenant_id: tenantId,
          program_id: program.id,
          mustahiq_id: mustahiqs[0].id,
          kelompok_id: groupA.id,
          jumlah_diterima: 'Rp 500.000',
          status: 'BELUM'
        },
        {
          tenant_id: tenantId,
          program_id: program.id,
          mustahiq_id: mustahiqs[1].id,
          kelompok_id: groupA.id,
          jumlah_diterima: 'Rp 500.000',
          status: 'BELUM'
        }
      ]);

    if (distErr) throw distErr;
    console.log('✓ Alokasi penyaluran awal dibuat.');

    console.log('\n=== PROSES PENYEMAIAN SELESAI (SUKSES) ===');

  } catch (err) {
    console.error('❌ Eror saat seeding:', err.message);
  }
}

seed();
