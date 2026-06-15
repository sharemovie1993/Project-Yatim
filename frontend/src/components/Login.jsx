import React, { useState } from 'react';
import ApiService from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const payload = {
          email,
          password,
          name,
          tenant_name: tenantName,
          domain_or_slug: slug || undefined
        };
        await ApiService.register(payload);
        alert('Registrasi berhasil! Silakan masuk.');
        setIsRegister(false);
        setPassword('');
      } else {
        await ApiService.login(email, password);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Gagal memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="card glass" style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoBadge}>MC</div>
          <h2 style={styles.title}>Mustahiq Care</h2>
          <p style={styles.subtitle}>Sistem Informasi Santunan Yatim & Dhuafa</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Lengkap Anda</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nama Lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Sekolah / Yayasan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: Yayasan Al-Muthohar"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Domain / Slug Sekolah</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: al-muthohar (untuk subdomain URL)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Alamat Email</label>
            <input
              type="email"
              className="input"
              placeholder="email@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              className="input"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk Sistem'}
          </button>
        </form>

        <div style={styles.switchMode}>
          {isRegister ? (
            <p>
              Sudah punya akun?{' '}
              <span style={styles.link} onClick={() => setIsRegister(false)}>
                Masuk disini
              </span>
            </p>
          ) : (
            <p>
              Instansi baru?{' '}
              <span style={styles.link} onClick={() => setIsRegister(true)}>
                Daftar instansi & admin baru
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    borderRadius: '16px',
    padding: '36px 30px',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: 'hsl(var(--primary))',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '24px',
    fontFamily: 'var(--font-heading)',
    marginBottom: '12px',
    boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'hsl(var(--foreground))',
  },
  subtitle: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
  submitBtn: {
    marginTop: '8px',
    padding: '12px',
    fontSize: '15px',
    borderRadius: '8px',
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '18px',
    textAlign: 'center',
  },
  switchMode: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
  },
  link: {
    color: 'hsl(var(--primary))',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
