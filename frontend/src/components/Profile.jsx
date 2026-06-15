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
  const [rules, setRules] = useState({
    max_age_yatim: 15,
    whatsapp_admin: '',
  });

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const settingsPayload = {
        address,
        kepala_sekolah: kepalaSekolah,
        bendahara,
        npwp,
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
        <p style={styles.subtitle}>Sesuaikan data identitas resmi sekolah/yayasan untuk kops surat dan laporan PDF SPJ</p>
      </div>

      <div className="card" style={styles.card}>
        <form onSubmit={handleSave} style={styles.form}>
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
            <div style={styles.col}>
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
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Batasan Umur Anak Yatim (Tahun)</label>
              <input
                type="number"
                className="input"
                value={rules.max_age_yatim}
                onChange={(e) => setRules({ ...rules, max_age_yatim: parseInt(e.target.value) || 15 })}
              />
            </div>
            <div style={styles.col}>
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
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
    color: 'hsl(var(--muted-foreground))',
  },
};
