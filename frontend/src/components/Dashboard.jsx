import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    mustahiq: 0,
    kategori: 0,
    kelompok: 0,
    program: 0,
  });
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const mList = await ApiService.getMustahiq();
      const cList = await ApiService.getKategori();
      const kList = await ApiService.getKelompok();
      const pList = await ApiService.getProgram();

      setStats({
        mustahiq: mList.data?.length || 0,
        kategori: cList.data?.length || 0,
        kelompok: kList.data?.length || 0,
        program: pList.data?.length || 0,
      });

      const profile = await ApiService.getTenantProfile();
      setTenant(profile.data);
    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <div style={styles.loading}>Memuat data dashboard...</div>;
  }

  const expiryDateStr = tenant?.settings?.license_expires_at || '';
  let daysRemaining = 0;
  if (expiryDateStr) {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diff = expiry.getTime() - today.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Dashboard Utama</h1>
        <p style={styles.headerSubtitle}>Selamat Datang di Portal Mustahiq Care - {tenant?.name || 'Sekolah/Yayasan'}</p>
      </div>

      {/* Grid Statistik Widgets */}
      <div style={styles.statsGrid}>
        <div className="card glass" style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Mustahiq</span>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'hsl(var(--primary))' }}>👥</div>
          </div>
          <h2 style={styles.statValue}>{stats.mustahiq}</h2>
          <p style={styles.statFooter}>Aktif menerima santunan</p>
        </div>

        <div className="card glass" style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Kelompok Mustahiq</span>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>📂</div>
          </div>
          <h2 style={styles.statValue}>{stats.kelompok}</h2>
          <p style={styles.statFooter}>Kelompok distribusi wilayah</p>
        </div>

        <div className="card glass" style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Program Santunan</span>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>🎁</div>
          </div>
          <h2 style={styles.statValue}>{stats.program}</h2>
          <p style={styles.statFooter}>Agenda pelaksanaan aktif</p>
        </div>

        <div className="card glass" style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Kategori Terdaftar</span>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'hsl(var(--accent))' }}>🏷️</div>
          </div>
          <h2 style={styles.statValue}>{stats.kategori}</h2>
          <p style={styles.statFooter}>Kategori mustahiq dinamis</p>
        </div>
      </div>

      {/* Section Lisensi */}
      <div style={styles.sectionGrid}>
        <div className="card" style={styles.licenseCard}>
          <h3 style={styles.cardTitle}>Status Lisensi Instansi</h3>
          <p style={styles.cardDesc}>Masa aktif layanan server sekolah/yayasan Anda</p>
          
          <div style={styles.licenseStatusBox}>
            {expiryDateStr ? (
              <div style={styles.licenseValid}>
                <div style={styles.statusBadge(daysRemaining > 0)}>
                  {daysRemaining > 0 ? (daysRemaining > 7 ? 'AKTIF' : 'HAMPIR HABIS') : 'KEDALUWARSA'}
                </div>
                <div style={styles.licenseDetails}>
                  <p style={styles.detailsText}>Masa Aktif Hingga: <strong>{expiryDateStr}</strong></p>
                  <p style={styles.detailsText}>Sisa Waktu: <strong>{daysRemaining > 0 ? `${daysRemaining} Hari` : 'Sudah Habis'}</strong></p>
                </div>
              </div>
            ) : (
              <div style={styles.licenseInvalid}>
                <p>⚠️ Tidak ada lisensi aktif ter-sync di database lokal ini.</p>
              </div>
            )}
          </div>

          <button 
            className="btn btn-outline" 
            style={styles.billingTriggerBtn} 
            onClick={() => onNavigate && onNavigate('billing')}
          >
            💳 Kelola Lisensi & Tagihan
          </button>
        </div>

        <div className="card" style={styles.infoCard}>
          <h3 style={styles.cardTitle}>Informasi Aplikasi</h3>
          <p style={styles.cardDesc}>Mustahiq Care v2.0 REST API Backend + Vite Frontend</p>
          
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span>Tipe Database</span>
              <strong>SQLite (dev.db)</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Status Koneksi</span>
              <strong style={{ color: 'hsl(var(--primary))' }}>ONLINE (Backend Connected)</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Provider Engine</span>
              <strong>Prisma ORM</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Server Port</span>
              <strong>{import.meta.env.VITE_BACKEND_PORT || '5002'}</strong>
            </div>
          </div>
        </div>
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
  headerTitle: {
    fontSize: '26px',
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  statCard: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    fontWeight: '500',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
  },
  statFooter: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  licenseCard: {
    padding: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  cardDesc: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    marginBottom: '16px',
  },
  licenseStatusBox: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  licenseValid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusBadge: (isActive) => ({
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
    border: '1px solid ' + (isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
    color: isActive ? 'hsl(var(--primary))' : '#ef4444',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  }),
  licenseDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailsText: {
    fontSize: '13px',
    color: 'hsl(var(--foreground))',
  },
  licenseInvalid: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '500',
  },
  billingTriggerBtn: {
    width: '100%',
    padding: '12px',
  },
  infoCard: {
    padding: '24px',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    borderBottom: '1px dashed hsl(var(--border))',
    paddingBottom: '8px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    fontSize: '16px',
    fontWeight: '500',
  },
};
