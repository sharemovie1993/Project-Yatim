import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    mustahiq: 0,
    kategori: 0,
    kelompok: 0,
    program: 0,
    totalBudget: 0,
    genderRatio: { male: 0, female: 0, maleCount: 0, femaleCount: 0 },
    categoryStats: [],
    recentMustahiqs: [],
    recentPrograms: [],
    programStats: { draft: 0, aktif: 0, selesai: 0 }
  });
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const mList = await ApiService.getMustahiq();
      const cList = await ApiService.getKategori();
      const kList = await ApiService.getKelompok();
      const pList = await ApiService.getProgram();

      const mustahiqs = mList.data || [];
      const categories = cList.data || [];
      const groups = kList.data || [];
      const programs = pList.data || [];

      // Calculate gender counts and ratio
      let maleCount = 0;
      let femaleCount = 0;
      mustahiqs.forEach(m => {
        const gk = (m.jenis_kelamin || '').toUpperCase();
        if (gk === 'L' || gk === 'LAKI-LAKI' || gk === 'MALE' || gk === 'LAKI LAKI') maleCount++;
        else if (gk === 'P' || gk === 'PEREMPUAN' || gk === 'FEMALE') femaleCount++;
      });
      const totalGender = maleCount + femaleCount;
      const genderRatio = {
        male: totalGender > 0 ? Math.round((maleCount / totalGender) * 100) : 0,
        female: totalGender > 0 ? Math.round((femaleCount / totalGender) * 100) : 0,
        maleCount,
        femaleCount
      };

      // Calculate category stats
      const categoryCounts = {};
      mustahiqs.forEach(m => {
        const cat = m.kategori || 'Lainnya';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const categoryStats = Object.keys(categoryCounts).map(name => ({
        name,
        count: categoryCounts[name],
        percentage: mustahiqs.length > 0 ? Math.round((categoryCounts[name] / mustahiqs.length) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      // Filter 5 most recent registered mustahiqs
      const recentMustahiqs = [...mustahiqs]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);

      // Sum budget and statuses of programs
      let totalBudget = 0;
      let draftCount = 0;
      let activeCount = 0;
      let completedCount = 0;
      programs.forEach(p => {
        totalBudget += p.total_anggaran || 0;
        const st = (p.status || '').toUpperCase();
        if (st === 'DRAFT') draftCount++;
        else if (st === 'AKTIF') activeCount++;
        else if (st === 'SELESAI') completedCount++;
      });
      const programStats = { draft: draftCount, aktif: activeCount, selesai: completedCount };

      // Filter 5 most recent programs
      const recentPrograms = [...programs]
        .sort((a, b) => new Date(b.tanggal_pelaksanaan || 0) - new Date(a.tanggal_pelaksanaan || 0))
        .slice(0, 5);

      setStats({
        mustahiq: mustahiqs.length,
        kategori: categories.length,
        kelompok: groups.length,
        program: programs.length,
        totalBudget,
        genderRatio,
        categoryStats,
        recentMustahiqs,
        recentPrograms,
        programStats
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

      {/* Welcome & Quick Actions */}
      <div style={styles.welcomeRow}>
        <div className="card glass" style={styles.welcomeCard}>
          <div style={styles.welcomeLeft}>
            <span style={styles.welcomeBadge}>PORTAL MANAJEMEN</span>
            <h2 style={styles.welcomeTitle}>Sinergi Kebaikan & Santunan</h2>
            <p style={styles.welcomeDesc}>
              Kelola data mustahiq penerima santunan, pantau sebaran wilayah kelompok, 
              dan monitoring program penyaluran dana secara aman dan real-time.
            </p>
          </div>
          <div style={styles.welcomeRight}>
            <span style={{ fontSize: '56px', filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))' }}>🕋</span>
          </div>
        </div>

        <div className="card" style={styles.quickActionsCard}>
          <h3 style={styles.cardTitle}>Pintasan Aksi Cepat</h3>
          <p style={styles.cardDesc}>Akses langsung menu utama program</p>
          <div style={styles.quickActionsGrid}>
            <button className="btn btn-primary" style={styles.actionBtn} onClick={() => onNavigate && onNavigate('mustahiq')}>
              👥 Daftar Mustahiq
            </button>
            <button className="btn btn-outline" style={styles.actionBtn} onClick={() => onNavigate && onNavigate('program')}>
              🎁 Buat Program
            </button>
            <button className="btn btn-outline" style={styles.actionBtn} onClick={() => onNavigate && onNavigate('kelompok')}>
              📂 Kelompok Wilayah
            </button>
            <button className="btn btn-accent" style={{ ...styles.actionBtn, color: 'white' }} onClick={() => onNavigate && onNavigate('billing')}>
              💳 Kelola Lisensi
            </button>
          </div>
        </div>
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
          <p style={styles.statFooter}>{stats.programStats.aktif} Aktif, {stats.programStats.selesai} Selesai</p>
        </div>

        <div className="card glass" style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Anggaran</span>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>💰</div>
          </div>
          <h2 style={styles.statValue}>
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.totalBudget)}
          </h2>
          <p style={styles.statFooter}>Teralokasikan di seluruh program</p>
        </div>
      </div>

      {/* Section Demographics & Charts */}
      <div style={styles.sectionGrid}>
        {/* Sebaran Kategori */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Sebaran Kategori Mustahiq</h3>
          <p style={styles.cardDesc}>Persentase penerima santunan berdasarkan kategori asnaf</p>
          <div style={styles.categoryStatsWrapper}>
            {stats.categoryStats.length === 0 ? (
              <p style={styles.noDataText}>Belum ada data kategori mustahiq.</p>
            ) : (
              stats.categoryStats.map(cat => (
                <div key={cat.name} style={styles.categoryStatItem}>
                  <div style={styles.categoryItemHeader}>
                    <span>{cat.name}</span>
                    <strong>{cat.count} orang ({cat.percentage}%)</strong>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={styles.progressBarFill(cat.percentage)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demografi Gender */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Rasio Demografis Gender</h3>
          <p style={styles.cardDesc}>Perbandingan jumlah mustahiq laki-laki vs perempuan</p>
          <div style={styles.genderStatsWrapper}>
            <div style={styles.genderDonutContainer}>
              <svg width="120" height="120" viewBox="0 0 36 36" style={styles.donutSvg}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                <circle 
                  cx="18" cy="18" r="15.915" 
                  fill="none" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="3.2" 
                  strokeDasharray={`${stats.genderRatio.male} ${100 - stats.genderRatio.male}`} 
                  strokeDashoffset="25" 
                  strokeLinecap="round"
                />
              </svg>
              <div style={styles.donutLabel}>
                <strong style={{ fontSize: '18px', fontWeight: '800' }}>{stats.genderRatio.male}%</strong>
                <span style={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}>Laki-laki</span>
              </div>
            </div>

            <div style={styles.genderInfoList}>
              <div style={styles.genderInfoItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'hsl(var(--primary))', fontSize: '18px', fontWeight: 'bold' }}>♂</span>
                  <span>Laki-Laki</span>
                </div>
                <strong>{stats.genderRatio.maleCount} Jiwa ({stats.genderRatio.male}%)</strong>
              </div>
              <div style={styles.genderInfoItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>♀</span>
                  <span>Perempuan</span>
                </div>
                <strong>{stats.genderRatio.femaleCount} Jiwa ({stats.genderRatio.female}%)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tables - Recent Registered Mustahiq & Recent Programs */}
      <div style={styles.sectionGrid}>
        {/* Recent Registered Mustahiq */}
        <div className="card" style={styles.tableCard}>
          <h3 style={styles.cardTitle}>Mustahiq Baru Terdaftar</h3>
          <p style={styles.cardDesc}>5 data mustahiq terbaru yang didaftarkan</p>
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama Lengkap</th>
                  <th style={styles.th}>Kategori</th>
                  <th style={styles.th}>Gender</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentMustahiqs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.noDataCell}>Belum ada data mustahiq.</td>
                  </tr>
                ) : (
                  stats.recentMustahiqs.map(m => (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}><strong>{m.nama_lengkap}</strong></td>
                      <td style={styles.td}>{m.kategori}</td>
                      <td style={styles.td}>
                        {m.jenis_kelamin === 'L' || m.jenis_kelamin === 'LAKI-LAKI' || m.jenis_kelamin === 'LAKI LAKI' ? 'Laki-laki' : 'Perempuan'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badge(m.status === 'AKTIF' ? 'success' : (m.status === 'SURVEY' ? 'warning' : 'danger'))}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Programs */}
        <div className="card" style={styles.tableCard}>
          <h3 style={styles.cardTitle}>Agenda Program Terkini</h3>
          <p style={styles.cardDesc}>5 program pelaksanaan santunan terdekat</p>
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama Program</th>
                  <th style={styles.th}>Pelaksanaan</th>
                  <th style={styles.th}>Anggaran</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPrograms.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.noDataCell}>Belum ada agenda program.</td>
                  </tr>
                ) : (
                  stats.recentPrograms.map(p => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}><strong>{p.nama_program}</strong></td>
                      <td style={styles.td}>{new Date(p.tanggal_pelaksanaan).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
                      <td style={styles.td}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.total_anggaran)}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badge(p.status === 'SELESAI' ? 'success' : (p.status === 'AKTIF' ? 'warning' : 'neutral'))}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section Lisensi & Info Server */}
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
  welcomeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    alignItems: 'stretch',
  },
  welcomeCard: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '12px',
  },
  welcomeLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  welcomeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'hsl(var(--primary))',
    fontSize: '10px',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '12px',
    letterSpacing: '1px',
  },
  welcomeTitle: {
    fontSize: '22px',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: 0,
  },
  welcomeDesc: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.5',
    margin: 0,
  },
  welcomeRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '16px',
  },
  quickActionsCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    flexGrow: 1,
  },
  actionBtn: {
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  chartCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  categoryStatsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '8px',
  },
  noDataText: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    textAlign: 'center',
    padding: '20px 0',
  },
  categoryStatItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  categoryItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    fontWeight: '500',
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'hsl(var(--muted))',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: (percentage) => ({
    width: `${percentage}%`,
    height: '100%',
    backgroundColor: 'hsl(var(--primary))',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out',
  }),
  genderStatsWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: '20px',
    padding: '12px 0',
    flexGrow: 1,
  },
  genderDonutContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSvg: {
    transform: 'rotate(-90deg)',
  },
  donutLabel: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderInfoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    maxWidth: '220px',
  },
  genderInfoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    borderBottom: '1px solid hsl(var(--border))',
    paddingBottom: '6px',
  },
  tableCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  tableResponsive: {
    overflowX: 'auto',
    marginTop: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  th: {
    padding: '10px 12px',
    borderBottom: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
    fontWeight: '600',
  },
  noDataCell: {
    padding: '24px',
    textAlign: 'center',
    color: 'hsl(var(--muted-foreground))',
  },
  tr: {
    borderBottom: '1px solid hsl(var(--border))',
  },
  td: {
    padding: '12px',
    color: 'hsl(var(--foreground))',
  },
  badge: (type) => {
    let backgroundColor = 'rgba(120, 120, 120, 0.12)';
    let color = 'hsl(var(--muted-foreground))';
    let borderColor = 'rgba(120, 120, 120, 0.3)';

    if (type === 'success') {
      backgroundColor = 'rgba(16, 185, 129, 0.12)';
      color = 'hsl(var(--primary))';
      borderColor = 'rgba(16, 185, 129, 0.3)';
    } else if (type === 'warning') {
      backgroundColor = 'rgba(245, 158, 11, 0.12)';
      color = 'hsl(var(--accent))';
      borderColor = 'rgba(245, 158, 11, 0.3)';
    } else if (type === 'danger') {
      backgroundColor = 'rgba(239, 68, 68, 0.12)';
      color = '#ef4444';
      borderColor = 'rgba(239, 68, 68, 0.3)';
    }

    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      border: `1px solid ${borderColor}`,
      backgroundColor,
      color,
    };
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
