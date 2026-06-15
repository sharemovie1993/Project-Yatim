import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';

export default function Update() {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isBehind, setIsBehind] = useState(false);
  const [commits, setCommits] = useState([]);
  const [progress, setProgress] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [errorDetails, setErrorDetails] = useState('');
  
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // Load and check updates on mount
  useEffect(() => {
    checkUpdates();
    checkActiveProgress();
    
    return () => {
      stopPolling();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const checkUpdates = async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const res = await ApiService.checkUpdate();
      if (res.success) {
        setIsBehind(res.isBehind);
        setCommits(res.commits || []);
      }
    } catch (err) {
      console.error('Failed to check updates:', err);
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const checkActiveProgress = async () => {
    try {
      const res = await ApiService.getUpdateStatus();
      if (res.success && res.data && res.data.status === 'running') {
        setUpdating(true);
        setProgress(res.data);
        startPolling();
      }
    } catch (err) {
      console.error('Failed to fetch initial progress:', err);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await ApiService.getUpdateStatus();
        if (res.success && res.data) {
          const current = res.data;
          setProgress(current);

          if (current.status === 'success') {
            stopPolling();
            startReloadCountdown();
          } else if (current.status === 'failed') {
            stopPolling();
            setUpdating(false);
            setErrorDetails(current.error || 'Terjadi kesalahan yang tidak diketahui.');
          }
        }
      } catch (err) {
        console.error('Error polling update progress:', err);
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startReloadCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let counter = 5;
    setCountdown(counter);
    countdownRef.current = setInterval(() => {
      counter -= 1;
      setCountdown(counter);
      if (counter <= 0) {
        clearInterval(countdownRef.current);
        window.location.reload();
      }
    }, 1000);
  };

  const handleStartUpdate = async () => {
    const confirmUpdate = window.confirm(
      'Apakah Anda yakin ingin memulai pembaruan aplikasi?\n\n' +
      'Proses ini akan mengunduh kode terbaru dari GitHub, memperbarui database, merestart aplikasi, dan membangun aset frontend baru.'
    );
    if (!confirmUpdate) return;

    setUpdating(true);
    setErrorDetails('');
    setProgress({
      status: 'running',
      step: 'pulling',
      message: 'Memulai pembaruan...'
    });

    try {
      const res = await ApiService.executeUpdate();
      if (res.success) {
        startPolling();
      } else {
        setUpdating(false);
        setErrorDetails(res.error || 'Gagal memicu pembaruan aplikasi.');
      }
    } catch (err) {
      setUpdating(false);
      setErrorDetails(err.message || 'Kesalahan koneksi ke server backend.');
    }
  };

  // Helper to check step index
  const getStepStatus = (stepName) => {
    if (!progress) return 'pending';
    
    const stepsOrder = ['pulling', 'installing', 'migrating', 'building', 'restarting', 'done'];
    const currentIdx = stepsOrder.indexOf(progress.step);
    const stepIdx = stepsOrder.indexOf(stepName);

    if (progress.status === 'failed' && progress.step === stepName) {
      return 'failed';
    }

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'active';
    return 'pending';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>🔄 Pembaruan Aplikasi (GitHub Update)</h2>
        <p style={styles.subtitle}>
          Kelola sinkronisasi kode dan fitur-fitur baru aplikasi Mustahiq Care langsung dari GitHub repository.
        </p>
      </header>

      <div style={styles.grid}>
        {/* PANEL KIRI: STATUS / AKSI */}
        <div className="card" style={styles.panelLeft}>
          {updating ? (
            /* STEPPER UPDATE SEDANG BERJALAN */
            <div style={styles.statusBox}>
              <h3 style={styles.boxTitle}>Proses Pembaruan Sedang Berjalan</h3>
              <p style={styles.boxDesc}>Harap tunggu beberapa menit, sistem sedang melakukan pembaruan di latar belakang.</p>
              
              <div style={styles.stepperContainer}>
                {/* STEP 1: Git Pull */}
                <div style={styles.stepRow}>
                  <div style={styles.stepBadge(getStepStatus('pulling'))}>
                    {getStepStatus('pulling') === 'completed' ? '✓' : '1'}
                  </div>
                  <div style={styles.stepContent}>
                    <span style={styles.stepTitle}>Menarik Kode Terbaru</span>
                    <span style={styles.stepDesc}>Mengambil kode terbaru dari GitHub (`git pull`)</span>
                  </div>
                </div>

                {/* STEP 2: NPM Install */}
                <div style={styles.stepRow}>
                  <div style={styles.stepBadge(getStepStatus('installing'))}>
                    {getStepStatus('installing') === 'completed' ? '✓' : '2'}
                  </div>
                  <div style={styles.stepContent}>
                    <span style={styles.stepTitle}>Menginstal Dependensi</span>
                    <span style={styles.stepDesc}>Memasang modul/library Node.js (`npm install`)</span>
                  </div>
                </div>

                {/* STEP 3: Database Migration */}
                <div style={styles.stepRow}>
                  <div style={styles.stepBadge(getStepStatus('migrating'))}>
                    {getStepStatus('migrating') === 'completed' ? '✓' : '3'}
                  </div>
                  <div style={styles.stepContent}>
                    <span style={styles.stepTitle}>Migrasi Skema Database</span>
                    <span style={styles.stepDesc}>Menyinkronkan skema database lokal (`prisma db push`)</span>
                  </div>
                </div>

                {/* STEP 4: Frontend Compile */}
                <div style={styles.stepRow}>
                  <div style={styles.stepBadge(getStepStatus('building'))}>
                    {getStepStatus('building') === 'completed' ? '✓' : '4'}
                  </div>
                  <div style={styles.stepContent}>
                    <span style={styles.stepTitle}>Kompilasi Frontend</span>
                    <span style={styles.stepDesc}>Membangun ulang bundel statis React (`vite build`)</span>
                  </div>
                </div>

                {/* STEP 5: Service Restart */}
                <div style={styles.stepRow}>
                  <div style={styles.stepBadge(getStepStatus('restarting'))}>
                    {getStepStatus('restarting') === 'completed' ? '✓' : '5'}
                  </div>
                  <div style={styles.stepContent}>
                    <span style={styles.stepTitle}>Memuat Ulang Layanan</span>
                    <span style={styles.stepDesc}>Mematikan & menyalakan ulang server backend/frontend (`pm2`)</span>
                  </div>
                </div>
              </div>

              {/* Progress message bar */}
              <div style={styles.progressBarWrapper}>
                <div style={styles.progressBarInner(progress?.step)} />
              </div>
              <p style={styles.progressMessage}>💬 {progress?.message}</p>

              {progress?.status === 'success' && (
                <div style={styles.successMessage}>
                  🎉 Update Sukses! Halaman ini akan disegarkan dalam <strong>{countdown}</strong> detik...
                </div>
              )}
            </div>
          ) : (
            /* DUA STATUS SEBELUM/SETELAH UPDATE */
            <div style={styles.statusBox}>
              {checking ? (
                <div style={styles.centerAlign}>
                  <div className="spinner" style={styles.spinner}></div>
                  <p style={{ marginTop: '16px', fontWeight: '500' }}>Menghubungi GitHub untuk mengecek pembaruan...</p>
                </div>
              ) : isBehind ? (
                /* ADA PEMBARUAN */
                <div>
                  <div style={styles.alertWarning}>
                    <span style={{ fontSize: '24px', marginRight: '12px' }}>⚠️</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '15px' }}>Versi Baru Tersedia!</strong>
                      <span style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
                        Ditemukan {commits.length} commit baru di GitHub repository. Silakan lakukan pembaruan segera.
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.actionBlock}>
                    <button className="btn btn-primary" style={styles.updateBtn} onClick={handleStartUpdate}>
                      🚀 Mulai Update Aplikasi Sekarang
                    </button>
                    <button className="btn btn-outline" style={styles.checkBtn} onClick={() => checkUpdates()}>
                      🔄 Periksa Ulang
                    </button>
                  </div>
                </div>
              ) : (
                /* SUDAH TERKINI */
                <div style={styles.centerAlign}>
                  <div style={styles.shieldBadge}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(var(--primary))' }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 11l2 2 4-4"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Aplikasi Sudah Terkini</h3>
                  <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13.5px', marginBottom: '24px', textAlign: 'center', maxWidth: '360px' }}>
                    Sistem Anda sinkron dengan commit terbaru dari remote repository GitHub. Tidak ada pembaruan kode yang tertunda.
                  </p>
                  <button className="btn btn-outline" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={() => checkUpdates()}>
                    🔎 Paksa Cek Pembaruan Baru
                  </button>
                </div>
              )}

              {/* TAMPILAN ERROR JIKA UPDATE GAGAL */}
              {errorDetails && (
                <div style={styles.errorBox}>
                  <h4 style={styles.errorTitle}>❌ Pembaruan Gagal dilakukan</h4>
                  <pre style={styles.errorPre}>{errorDetails}</pre>
                  <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '10px' }}>
                    *Coba periksa koneksi internet server lokal Anda atau pastikan konfigurasi repositori Git valid.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PANEL KANAN: RIWAYAT COMMIT TERBARU / CHANGE LOG */}
        <div className="card" style={styles.panelRight}>
          <h3 style={styles.panelRightTitle}>Daftar Commit GitHub Terbaru</h3>
          <p style={styles.panelRightDesc}>Histori commit baru yang belum ditarik ke aplikasi server lokal Anda:</p>
          
          <div style={styles.commitsList}>
            {commits.length === 0 ? (
              <div style={styles.emptyCommits}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📄</span>
                Tidak ada commit tertunda (Semua perubahan sudah tersinkronisasi)
              </div>
            ) : (
              commits.map((commit, index) => (
                <div key={commit.hash || index} style={styles.commitItem}>
                  <div style={styles.commitBadge}>
                    {commit.hash ? commit.hash.substring(0, 7) : 'Commit'}
                  </div>
                  <div style={styles.commitDetails}>
                    <div style={styles.commitMsg}>{commit.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'hsl(var(--foreground))',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    alignItems: 'start',
  },
  panelLeft: {
    padding: '28px',
  },
  panelRight: {
    padding: '28px',
    maxHeight: '520px',
    display: 'flex',
    flexDirection: 'column',
  },
  panelRightTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  panelRightDesc: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '12.5px',
    marginBottom: '20px',
  },
  statusBox: {
    width: '100%',
  },
  boxTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '6px',
  },
  boxDesc: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '13.5px',
    marginBottom: '28px',
  },
  centerAlign: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid hsl(var(--border))',
    borderTopColor: 'hsl(var(--primary))',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  shieldBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  alertWarning: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    border: '1px solid rgba(217, 119, 6, 0.2)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '32px',
  },
  actionBlock: {
    display: 'flex',
    gap: '12px',
  },
  updateBtn: {
    flex: 1.5,
    padding: '14px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  checkBtn: {
    flex: 0.5,
    padding: '14px',
    fontSize: '14px',
  },
  stepperContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    marginBottom: '28px',
    paddingLeft: '6px',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  stepBadge: (status) => {
    let bgColor = 'hsl(var(--muted))';
    let color = 'hsl(var(--muted-foreground))';
    let border = '1px solid hsl(var(--border))';

    if (status === 'completed') {
      bgColor = 'rgba(5, 150, 105, 0.15)';
      color = 'hsl(var(--primary))';
      border = '1px solid hsl(var(--primary))';
    } else if (status === 'active') {
      bgColor = 'hsl(var(--primary))';
      color = 'white';
      border = '1px solid hsl(var(--primary))';
    } else if (status === 'failed') {
      bgColor = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      border = '1px solid #ef4444';
    }

    return {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: color,
      border: border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12.5px',
      fontWeight: 'bold',
      flexShrink: 0,
      transition: 'all 0.3s ease',
    };
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'hsl(var(--foreground))',
  },
  stepDesc: {
    fontSize: '11.5px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '2px',
  },
  progressBarWrapper: {
    width: '100%',
    height: '6px',
    backgroundColor: 'hsl(var(--border))',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarInner: (step) => {
    const stepsOrder = ['pulling', 'installing', 'migrating', 'building', 'restarting', 'done'];
    const idx = stepsOrder.indexOf(step || 'pulling');
    const pct = ((idx + 1) / stepsOrder.length) * 100;
    return {
      width: `${pct}%`,
      height: '100%',
      backgroundColor: 'hsl(var(--primary))',
      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  },
  progressMessage: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    fontStyle: 'italic',
    marginBottom: '20px',
  },
  successMessage: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    border: '1px solid rgba(5, 150, 105, 0.2)',
    color: 'hsl(var(--foreground))',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '13.5px',
    textAlign: 'center',
  },
  errorBox: {
    marginTop: '24px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '18px',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: '14.5px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  errorPre: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#f87171',
    backgroundColor: '#1e293b',
    padding: '12px',
    borderRadius: '6px',
    overflowX: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
  },
  commitsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyCommits: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'hsl(var(--muted-foreground))',
    fontSize: '13.5px',
    border: '1px dashed hsl(var(--border))',
    borderRadius: '10px',
  },
  commitItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid hsl(var(--border))',
  },
  commitBadge: {
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--muted-foreground))',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  commitDetails: {
    flex: 1,
  },
  commitMsg: {
    fontSize: '13px',
    color: 'hsl(var(--foreground))',
    lineHeight: '1.4',
  },
};
