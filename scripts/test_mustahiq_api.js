const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = 'https://rzzwkqilszliwmxknptf.supabase.co';
const supabaseAnonKey = 'sb_publishable_OtEEiwC8pOpQl3tLr85sNQ_Klxl31fq';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log('=== MEMULAI PENGUJIAN ENDPOINT MUSTAHIQ ===');

  try {
    // 1. Dapatkan Tenant ID "demo"
    console.log('[1/5] Mengambil tenant profile untuk slug "demo"...');
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain_or_slug', 'demo')
      .single();

    if (tenantErr) {
      throw new Error('Gagal mengambil tenant: ' + tenantErr.message);
    }
    console.log(`✓ Tenant ditemukan: "${tenant.name}" (${tenant.id})`);

    const tenantId = tenant.id;

    // 2. Tambah Mustahiq Baru
    console.log('\n[2/5] Menguji INSERT Mustahiq...');
    const testNik = '1234567890123456';
    
    // Hapus data uji coba sebelumnya jika ada untuk menghindari konflik NIK unik per tenant
    await supabase.from('mustahiq').delete().eq('tenant_id', tenantId).eq('nik', testNik);

    const testPayload = {
      tenant_id: tenantId,
      nik: testNik,
      nama_lengkap: 'Budi Santoso (Test API)',
      kategori: 'YATIM',
      alamat_lengkap: 'Jl. Uji Coba No. 100, Jakarta',
      status: 'SURVEY',
      catatan: 'Dibuat otomatis oleh script pengujian API'
    };

    const { data: created, error: insertErr } = await supabase
      .from('mustahiq')
      .insert([testPayload])
      .select()
      .single();

    if (insertErr) {
      throw new Error('Gagal menambahkan mustahiq: ' + insertErr.message);
    }
    console.log(`✓ Mustahiq berhasil ditambah: ${created.nama_lengkap} (ID: ${created.id})`);

    const mustahiqId = created.id;

    // 3. Ambil Daftar Mustahiq
    console.log('\n[3/5] Menguji SELECT Mustahiq...');
    const { data: list, error: selectErr } = await supabase
      .from('mustahiq')
      .select('*')
      .eq('tenant_id', tenantId);

    if (selectErr) {
      throw new Error('Gagal membaca list mustahiq: ' + selectErr.message);
    }
    console.log(`✓ Berhasil mengambil list. Total data di tenant ini: ${list.length}`);
    const found = list.find(m => m.id === mustahiqId);
    if (!found) {
      throw new Error('Data yang baru dimasukkan tidak ditemukan di dalam list!');
    }
    console.log('✓ Data uji coba terverifikasi ada dalam database.');

    // 4. Update Mustahiq
    console.log('\n[4/5] Menguji UPDATE Mustahiq...');
    const { error: updateErr } = await supabase
      .from('mustahiq')
      .update({ status: 'AKTIF', catatan: 'Catatan diperbarui saat pengujian API' })
      .eq('id', mustahiqId);

    if (updateErr) {
      throw new Error('Gagal memperbarui mustahiq: ' + updateErr.message);
    }

    const { data: updated, error: selectSingleErr } = await supabase
      .from('mustahiq')
      .select('*')
      .eq('id', mustahiqId)
      .single();

    if (selectSingleErr) {
      throw new Error('Gagal membaca data mustahiq terupdate: ' + selectSingleErr.message);
    }
    console.log(`✓ Data berhasil diperbarui. Status saat ini: ${updated.status}, Catatan: "${updated.catatan}"`);

    // 5. Hapus Mustahiq
    console.log('\n[5/5] Menguji DELETE Mustahiq...');
    const { error: deleteErr } = await supabase
      .from('mustahiq')
      .delete()
      .eq('id', mustahiqId);

    if (deleteErr) {
      throw new Error('Gagal menghapus mustahiq: ' + deleteErr.message);
    }

    const { data: deletedCheck } = await supabase
      .from('mustahiq')
      .select('*')
      .eq('id', mustahiqId)
      .maybeSingle();

    if (deletedCheck) {
      throw new Error('Data mustahiq masih ada di database setelah dihapus!');
    }
    console.log('✓ Data mustahiq berhasil dihapus.');
    console.log('\n=== SEMUA PENGUJIAN API BERHASIL (100% LOLOS) ===');

  } catch (err) {
    console.error('\n❌ PENGUJIAN API GAGAL:', err.message);
  }
}

runTest();
