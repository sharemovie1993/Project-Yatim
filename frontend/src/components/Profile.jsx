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
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStempel, setUploadingStempel] = useState(false);

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
      
      if (settings.rules) {
        setRules({
          max_age_yatim: settings.rules.max_age_yatim || 15,
          whatsapp_admin: settings.rules.whatsapp_admin || '',
        });
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
        rules: {
          ...rules,
          max_mustahiq: tenant?.settings?.rules?.max_mustahiq || 100
        }
      };

      await ApiService.updateTenantProfile(name, settingsPayload);
      alert('Profil sekolah/tenant berhasil disimpan.');
      await loadData();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
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
                <label style={styles.label}>Nama Kepala Sekolah / Pimpinan *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nama Lengkap beserta gelar"
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  required
                />
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
