import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Profile() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [bendahara, setBendahara] = useState('');
  const [npwp, setNpwp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [kota, setKota] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [stempelUrl, setStempelUrl] = useState('');
  const [rules, setRules] = useState({
    max_age_yatim: 15,
    whatsapp_admin: '',
    single_group_restriction: false,
  });

  const [kopParent, setKopParent] = useState('');
  const [jabatanPimpinan, setJabatanPimpinan] = useState('Kepala Sekolah');
  const [nipPimpinan, setNipPimpinan] = useState('');
  const [jabatanBendahara, setJabatanBendahara] = useState('Bendahara');
  const [nipBendahara, setNipBendahara] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStempel, setUploadingStempel] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  // Domain verification state
  const [domainCheckResult, setDomainCheckResult] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [lastCheckedDomain, setLastCheckedDomain] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getTenantProfile();
      setTenant(res.data);
      setName(res.data.name || '');
      
      const settings = res.data.settings || {};
      setAddress(settings.address || '');
      setKepalaSekolah(settings.kepala_sekolah || '');
      setBendahara(settings.bendahara || '');
      setNpwp(settings.npwp || '');
      setPhoneNumber(settings.phone_number || '');
      setEmail(settings.email || '');
      setKota(settings.kota || '');
      setLogoUrl(settings.logo_url || '');
      setStempelUrl(settings.stempel_url || '');
      
      setKopParent(settings.kop_parent || '');
      setJabatanPimpinan(settings.jabatan_pimpinan || 'Kepala Sekolah');
      setNipPimpinan(settings.nip_pimpinan || '');
      setJabatanBendahara(settings.jabatan_bendahara || 'Bendahara');
      setNipBendahara(settings.nip_bendahara || '');

      if (settings.rules) {
        setRules({
          max_age_yatim: settings.rules.max_age_yatim || 15,
          whatsapp_admin: settings.rules.whatsapp_admin || '',
          single_group_restriction: settings.rules.single_group_restriction || false,
        });
      }
      const cd = res.data.custom_domain || '';
      setCustomDomain(cd);
      // Jika domain sudah tersimpan di DB, anggap sudah terverifikasi sebelumnya
      if (cd) {
        setLastCheckedDomain(cd);
        setDomainCheckResult({ status: 'verified', verified: true, message: `Domain '${cd}' sudah terdaftar dan aktif.` });
      } else {
        setLastCheckedDomain('');
        setDomainCheckResult(null);
      }
    } catch (e) {
      console.error('Failed to load profile settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckDomain = async () => {
    const domainToCheck = customDomain.trim().toLowerCase();
    if (!domainToCheck) return;
    setCheckingDomain(true);
    setDomainCheckResult(null);
    try {
      const res = await ApiService.checkDomain(domainToCheck);
      setDomainCheckResult(res);
      setLastCheckedDomain(domainToCheck);
    } catch (err) {
      setDomainCheckResult({ status: 'error', verified: false, message: `Gagal melakukan pengecekan: ${err.message}` });
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Ukuran file maksimal adalah 2MB.');
    
    setUploadingLogo(true);
    try {
      const res = await ApiService.uploadProfileImage(file);
      setLogoUrl(res.url);
      alert('Logo berhasil diunggah.');
    } catch (err) {
      alert('Gagal mengunggah logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleStempelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('Ukuran file maksimal adalah 2MB.');

    setUploadingStempel(true);
    try {
      const res = await ApiService.uploadProfileImage(file);
      setStempelUrl(res.url);
      alert('Stempel berhasil diunggah.');
    } catch (err) {
      alert('Gagal mengunggah stempel: ' + err.message);
    } finally {
      setUploadingStempel(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const settingsPayload = {
        address,
        kepala_sekolah: kepalaSekolah,
        bendahara,
        npwp,
        phone_number: phoneNumber,
        email,
        kota,
        logo_url: logoUrl,
        stempel_url: stempelUrl,
        kop_parent: kopParent,
        jabatan_pimpinan: jabatanPimpinan,
        nip_pimpinan: nipPimpinan,
        jabatan_bendahara: jabatanBendahara,
        nip_bendahara: nipBendahara,
        rules: {
          ...rules,
          max_mustahiq: tenant?.settings?.rules?.max_mustahiq || 100
        }
      };

      // Simpan profil SAJA — domain kustom diurus oleh handleSaveDomain
      await ApiService.updateTenantProfile(name, settingsPayload);
      alert('Profil sekolah/tenant berhasil disimpan.');
      await loadData();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handler KHUSUS untuk aktivasi custom domain — terpisah dari form profil
  const handleSaveDomain = async () => {
    const domainToSave = customDomain.trim().toLowerCase();
    if (!domainToSave) return;

    // Wajib sudah dicek dan terverifikasi
    if (!domainCheckResult || !domainCheckResult.verified || lastCheckedDomain !== domainToSave) {
      alert('Harap klik \'🔍 Cek DNS\' terlebih dahulu dan pastikan hasilnya ✅ terverifikasi sebelum mengaktifkan domain.');
      return;
    }

    setSavingDomain(true);
    try {
      await ApiService.updateCustomDomain(domainToSave);
      alert(`Domain kustom '${domainToSave}' berhasil diaktifkan! SSL akan diterbitkan otomatis oleh server.`);
      await loadData();
    } catch (err) {
      alert('Gagal mengaktifkan domain: ' + err.message);
    } finally {
      setSavingDomain(false);
    }
  };

  // Handler untuk melepas / menghapus custom domain
  const handleRemoveDomain = async () => {
    if (!tenant?.custom_domain) return;
    const confirm = window.confirm(`Yakin ingin melepas domain kustom '${tenant.custom_domain}'? Domain tersebut tidak akan lagi terhubung ke aplikasi ini.`);
    if (!confirm) return;

    setSavingDomain(true);
    try {
      await ApiService.updateCustomDomain(null);
      setCustomDomain('');
      setDomainCheckResult(null);
      setLastCheckedDomain('');
      alert('Domain kustom berhasil dilepas.');
      await loadData();
    } catch (err) {
      alert('Gagal melepas domain: ' + err.message);
    } finally {
      setSavingDomain(false);
    }
  };

  if (loading) {
    return <div style={styles.centerText}>Memuat data profil...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Pengaturan Profil Sekolah</h1>
        <p style={styles.subtitle}>Sesuaikan data identitas resmi sekolah/yayasan untuk kop surat dan laporan PDF SPJ</p>
      </div>

      <div className="card" style={styles.card}>
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.gridContainer}>
            {/* Kiri: Identitas Resmi & Uploader */}
            <div style={styles.leftColumn}>
              <h3 style={styles.sectionTitle}>🏢 Identitas Resmi Lembaga</h3>
              
              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Nama Instansi / Sekolah *</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Nomor NPWP Instansi</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="00.000.000.0-000.000"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Lembaga Induk / Yayasan Pengayom (Untuk Kop Surat)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: YAYASAN AT-TAQWA PURWAKARTA"
                  value={kopParent}
                  onChange={(e) => setKopParent(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Alamat Lengkap Kantor / Sekolah *</label>
                <input
                  type="text"
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Kota / Kabupaten *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: Purwakarta"
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    required
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Nomor Telepon Lembaga</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: 0264-123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Lembaga</label>
                <input
                  type="email"
                  className="input"
                  placeholder="Contoh: info@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Uploader Section */}
              <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>🖼️ Logo & Stempel Instansi</h3>
              
              <div style={styles.uploaderRow}>
                {/* Logo Uploader */}
                <div style={styles.uploaderBox}>
                  <span style={styles.label}>Logo Instansi (Kop Surat)</span>
                  <div style={styles.previewContainer}>
                    {logoUrl ? (
                      <div style={styles.imageWrapper}>
                        <img 
                          src={ApiService.getFileUrl(logoUrl)} 
                          alt="Logo Preview" 
                          style={styles.imagePreview} 
                        />
                        <button 
                          type="button" 
                          style={styles.removeBtn} 
                          onClick={() => setLogoUrl('')}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={styles.placeholderBox}>Belum ada logo</div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    id="logo-file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleLogoUpload}
                  />
                  <label 
                    htmlFor="logo-file" 
                    className="btn btn-outline" 
                    style={styles.uploadBtn}
                  >
                    {uploadingLogo ? 'Mengunggah...' : '📷 Pilih Logo'}
                  </label>
                </div>

                {/* Stempel Uploader */}
                <div style={styles.uploaderBox}>
                  <span style={styles.label}>Stempel Instansi (SPJ TTD)</span>
                  <div style={styles.previewContainer}>
                    {stempelUrl ? (
                      <div style={styles.imageWrapper}>
                        <img 
                          src={ApiService.getFileUrl(stempelUrl)} 
                          alt="Stempel Preview" 
                          style={styles.imagePreview} 
                        />
                        <button 
                          type="button" 
                          style={styles.removeBtn} 
                          onClick={() => setStempelUrl('')}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={styles.placeholderBox}>Belum ada stempel</div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    id="stempel-file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleStempelUpload}
                  />
                  <label 
                    htmlFor="stempel-file" 
                    className="btn btn-outline" 
                    style={styles.uploadBtn}
                  >
                    {uploadingStempel ? 'Mengunggah...' : '📷 Pilih Stempel'}
                  </label>
                  <span style={styles.hintText}>* Disarankan PNG transparan</span>
                </div>
              </div>
            </div>

            {/* Kanan: Penandatangan & Aturan */}
            <div style={styles.rightColumn}>
              <h3 style={styles.sectionTitle}>✍️ Pejabat Penandatangan SPJ</h3>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Pimpinan Lembaga / Kepala Sekolah *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nama Lengkap beserta gelar"
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  required
                />
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Jabatan Pimpinan *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: Kepala Sekolah"
                    value={jabatanPimpinan}
                    onChange={(e) => setJabatanPimpinan(e.target.value)}
                    required
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>NIP / NIK Pimpinan</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: 198008122005011002"
                    value={nipPimpinan}
                    onChange={(e) => setNipPimpinan(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Bendahara Sekolah *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nama Lengkap beserta gelar"
                  value={bendahara}
                  onChange={(e) => setBendahara(e.target.value)}
                  required
                />
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Jabatan Bendahara *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: Bendahara"
                    value={jabatanBendahara}
                    onChange={(e) => setJabatanBendahara(e.target.value)}
                    required
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>NIP / NIK Bendahara</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: 198203152009022001"
                    value={nipBendahara}
                    onChange={(e) => setNipBendahara(e.target.value)}
                  />
                </div>
              </div>

              <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>⚙️ Aturan & Validasi Aplikasi</h3>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Batasan Umur Anak Yatim (Tahun)</label>
                <input
                  type="number"
                  className="input"
                  value={rules.max_age_yatim}
                  onChange={(e) => setRules({ ...rules, max_age_yatim: parseInt(e.target.value) || 15 })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>No WhatsApp Admin (Untuk Notifikasi)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: 081234567890"
                  value={rules.whatsapp_admin}
                  onChange={(e) => setRules({ ...rules, whatsapp_admin: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Batasan Keanggotaan Kelompok Distribusi</label>
                <select 
                  className="input" 
                  value={rules.single_group_restriction ? 'single' : 'multiple'}
                  onChange={(e) => setRules({ ...rules, single_group_restriction: e.target.value === 'single' })}
                  style={{ backgroundColor: 'hsl(var(--background))' }}
                >
                  <option value="multiple">Bebas (Satu mustahiq bisa bergabung ke banyak kelompok)</option>
                  <option value="single">Terbatas (Satu mustahiq hanya boleh bergabung ke 1 kelompok saja)</option>
                </select>
              </div>

              <h3 style={{ ...styles.sectionTitle, marginTop: '24px' }}>🌐 Domain & Akses Web</h3>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Domain Bawaan Platform (Read-only)</label>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'hsl(var(--muted))',
                  color: 'hsl(var(--muted-foreground))',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  {tenant?.domain_or_slug ? `${tenant.domain_or_slug}.absenta.id` : '-'}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Domain Kustom (Custom Domain)</label>
                
                {/* Input + Tombol Cek */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Contoh: zakat.lembaga-anda.org"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value);
                      // Reset verifikasi jika domain diubah
                      if (e.target.value.trim().toLowerCase() !== lastCheckedDomain) {
                        setDomainCheckResult(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ whiteSpace: 'nowrap', minWidth: '110px', fontSize: '12px' }}
                    onClick={handleCheckDomain}
                    disabled={!customDomain.trim() || checkingDomain}
                  >
                    {checkingDomain ? '⏳ Mengecek...' : '🔍 Cek DNS'}
                  </button>
                </div>

                {/* Hasil Pengecekan DNS */}
                {domainCheckResult && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                    border: '1px solid',
                    ...(domainCheckResult.status === 'verified' ? {
                      backgroundColor: 'hsl(142 76% 97%)',
                      borderColor: 'hsl(142 76% 36%)',
                      color: 'hsl(142 76% 25%)'
                    } : domainCheckResult.status === 'wrong_ip' ? {
                      backgroundColor: 'hsl(38 92% 97%)',
                      borderColor: 'hsl(38 92% 50%)',
                      color: 'hsl(38 60% 25%)'
                    } : {
                      backgroundColor: 'hsl(0 84% 97%)',
                      borderColor: 'hsl(0 84% 60%)',
                      color: 'hsl(0 84% 30%)'
                    })
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                      {domainCheckResult.status === 'verified' && '✅ DNS Terverifikasi'}
                      {domainCheckResult.status === 'wrong_ip' && '⚠️ DNS Salah Tujuan'}
                      {domainCheckResult.status === 'not_found' && '❌ DNS Tidak Ditemukan'}
                      {domainCheckResult.status === 'invalid' && '❌ Format Domain Tidak Valid'}
                      {domainCheckResult.status === 'error' && '❌ Gagal Cek DNS'}
                    </div>
                    <div>{domainCheckResult.message}</div>
                    {domainCheckResult.resolved_ips && domainCheckResult.resolved_ips.length > 0 && (
                      <div style={{ marginTop: '4px', opacity: 0.8 }}>
                        IP terdeteksi: <strong>{domainCheckResult.resolved_ips.join(', ')}</strong>
                        {' '}| Target platform: <strong>{domainCheckResult.platform_ip}</strong>
                        {domainCheckResult.dns_method && ` (via ${domainCheckResult.dns_method} record)`}
                      </div>
                    )}
                    {domainCheckResult.status === 'wrong_ip' && (
                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '11.5px' }}>
                        💡 Perbarui A Record domain Anda ke: <strong>{domainCheckResult.platform_ip}</strong>
                        . Propagasi DNS biasanya memakan waktu 5–60 menit.
                      </div>
                    )}
                    {domainCheckResult.status === 'not_found' && (
                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '11.5px' }}>
                        💡 Buat A Record baru: <strong>Nama:</strong> {customDomain.split('.').slice(0, -2).join('.') || '@'}
                        {' '}<strong>Nilai/IP:</strong> {domainCheckResult.platform_ip || '103.129.148.127'}
                      </div>
                    )}
                  </div>
                )}

                {/* Panduan setup DNS */}
                {!domainCheckResult && (
                  <span style={{ ...styles.hintText, color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
                    * Setelah mengisi domain, klik "🔍 Cek DNS" untuk memverifikasi bahwa domain sudah diarahkan ke server platform sebelum menyimpan.
                  </span>
                )}

                {/* Tombol AKTIFKAN domain — hanya muncul jika DNS sudah verified dan domain berbeda dari yang aktif */}
                {domainCheckResult?.status === 'verified' && customDomain.trim().toLowerCase() !== (tenant?.custom_domain || '').trim().toLowerCase() && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '13px' }}
                      onClick={handleSaveDomain}
                      disabled={savingDomain}
                    >
                      {savingDomain ? '⏳ Mengaktifkan...' : '🌐 Aktifkan Domain Kustom'}
                    </button>
                  </div>
                )}

                {/* Tombol LEPAS domain — muncul jika sudah ada domain aktif */}
                {tenant?.custom_domain && (
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ width: '100%', fontSize: '12px', color: 'hsl(0 84% 50%)', borderColor: 'hsl(0 84% 70%)' }}
                      onClick={handleRemoveDomain}
                      disabled={savingDomain}
                    >
                      {savingDomain ? '⏳ Memproses...' : `🗑 Lepas Domain Aktif (${tenant.custom_domain})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : '💾 Simpan Profil Lembaga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '4px',
  },
  card: {
    padding: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '40px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderRight: '1px solid hsl(var(--border))',
    paddingRight: '40px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'hsl(var(--foreground))',
    borderBottom: '2px solid hsl(var(--primary))',
    paddingBottom: '6px',
    marginBottom: '8px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'hsl(var(--muted-foreground))',
  },
  uploaderRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  uploaderBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  previewContainer: {
    height: '110px',
    border: '2px dashed hsl(var(--border))',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hsl(var(--muted))',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholderBox: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    maxWidth: '90%',
    maxHeight: '90%',
    objectFit: 'contain',
  },
  removeBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  uploadBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'block',
  },
  hintText: {
    fontSize: '10px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '-4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
    borderTop: '1px solid hsl(var(--border))',
    paddingTop: '20px',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
    color: 'hsl(var(--muted-foreground))',
  },
};
