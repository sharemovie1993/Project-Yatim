import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Program() {
  const [programs, setPrograms] = useState([]);
  const [kelompokList, setKelompokList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Program state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProgram, setNewProgram] = useState({
    nama_program: '',
    tanggal_pelaksanaan: new Date().toISOString().slice(0, 10),
    jenis: 'UANG_TUNAI',
    total_anggaran: '',
    status: 'DRAFT',
  });

  // Distribution detail state
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [penyaluranList, setPenyaluranList] = useState([]);
  const [showDistModal, setShowDistModal] = useState(false);

  // Generate distribution state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genKelompokId, setGenKelompokId] = useState('');
  const [genJumlah, setGenJumlah] = useState('Rp 150.000');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getProgram();
      setPrograms(res.data || []);
      
      const kel = await ApiService.getKelompok();
      setKelompokList(kel.data || []);
    } catch (e) {
      console.error('Failed to load program data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProgram = async (e) => {
    e.preventDefault();
    if (!newProgram.nama_program.trim()) return alert('Nama program wajib diisi.');
    try {
      await ApiService.addProgram(newProgram);
      alert('Program santunan baru berhasil dibuat.');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert('Gagal membuat program: ' + err.message);
    }
  };

  const handleOpenDistributions = async (p) => {
    setSelectedProgram(p);
    setLoading(true);
    try {
      const res = await ApiService.getPenyaluran(p.id);
      setPenyaluranList(res.data || []);
      setShowDistModal(true);
    } catch (e) {
      console.error('Failed to load distribution list:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDist = async (e) => {
    e.preventDefault();
    if (!genKelompokId) return alert('Silakan pilih kelompok.');
    try {
      const res = await ApiService.generatePenyaluranUntukKelompok(selectedProgram.id, genKelompokId, genJumlah);
      alert(`Berhasil generate ${res.count} rencana penyaluran untuk anggota kelompok.`);
      setShowGenModal(false);
      // Reload distributions list
      const dRes = await ApiService.getPenyaluran(selectedProgram.id);
      setPenyaluranList(dRes.data || []);
    } catch (err) {
      alert('Gagal memproses: ' + err.message);
    }
  };

  const handleUpdateStatus = async (penyaluranId, status) => {
    try {
      await ApiService.updateStatusPenyaluran(penyaluranId, status);
      // Reload distributions list
      const dRes = await ApiService.getPenyaluran(selectedProgram.id);
      setPenyaluranList(dRes.data || []);
    } catch (err) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const handleDownloadPdf = (programId) => {
    const url = ApiService.getSpjPdfUrl(programId);
    window.open(url, '_blank');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Program & Penyaluran Santunan</h1>
          <p style={styles.subtitle}>Kelola program bantuan sosial dan cetak berkas SPJ secara realtime</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Rancang Program</button>
      </div>

      <div className="card" style={styles.tableCard}>
        {loading && !showDistModal ? (
          <div style={styles.centerText}>Memuat data program...</div>
        ) : programs.length === 0 ? (
          <div style={styles.centerText}>Belum ada program dirancang.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Nama Program</th>
                  <th style={styles.th}>Tanggal Pelaksanaan</th>
                  <th style={styles.th}>Jenis Bantuan</th>
                  <th style={styles.th}>Total Anggaran</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{p.nama_program}</td>
                    <td style={styles.td}>{p.tanggal_pelaksanaan}</td>
                    <td style={styles.td}>{p.jenis}</td>
                    <td style={styles.td}>Rp {(p.total_anggaran || 0).toLocaleString('id-ID')}</td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button className="btn btn-primary" style={styles.actionBtn} onClick={() => handleOpenDistributions(p)}>
                          📊 Distribusi
                        </button>
                        <button className="btn btn-outline" style={styles.actionBtn} onClick={() => handleDownloadPdf(p.id)}>
                          🖨️ Cetak SPJ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Program Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Rancang Program Baru</h3>
            <form onSubmit={handleAddProgram} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Program *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: SANTUNAN ANAK YATIM RAMADHAN"
                  value={newProgram.nama_program}
                  onChange={(e) => setNewProgram({ ...newProgram, nama_program: e.target.value })}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Tanggal Pelaksanaan *</label>
                <input
                  type="date"
                  className="input"
                  value={newProgram.tanggal_pelaksanaan}
                  onChange={(e) => setNewProgram({ ...newProgram, tanggal_pelaksanaan: e.target.value })}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Jenis Bantuan *</label>
                <select
                  className="input"
                  value={newProgram.jenis}
                  onChange={(e) => setNewProgram({ ...newProgram, jenis: e.target.value })}
                  required
                >
                  <option value="UANG_TUNAI">UANG TUNAI</option>
                  <option value="SEMBAKO">SEMBAKO</option>
                  <option value="PENDIDIKAN">PENDIDIKAN</option>
                  <option value="LAINNYA">LAINNYA</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Total Rencana Anggaran (Rp)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Contoh: 15000000"
                  value={newProgram.total_anggaran}
                  onChange={(e) => setNewProgram({ ...newProgram, total_anggaran: e.target.value })}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Program</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribution Manager Modal */}
      {showDistModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.largeModalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Detail Penyaluran: {selectedProgram?.nama_program}</h3>
                <p style={styles.modalDesc}>Kelola penerimaan santunan individu dan verifikasi serah terima.</p>
              </div>
              <div style={styles.headerButtons}>
                <button className="btn btn-primary" onClick={() => setShowGenModal(true)}>⚡ Generate via Kelompok</button>
                <button className="btn btn-outline" onClick={() => setShowDistModal(false)}>Tutup</button>
              </div>
            </div>

            <div style={styles.tableWrapperModal}>
              {penyaluranList.length === 0 ? (
                <div style={styles.centerText}>Belum ada target mustahiq. Silakan klik tombol 'Generate via Kelompok' untuk menambahkan.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Nama Penerima</th>
                      <th style={styles.th}>Kelompok</th>
                      <th style={styles.th}>Jenis Kategori</th>
                      <th style={styles.th}>Jumlah Diterima</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penyaluranList.map(py => (
                      <tr key={py.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: '600' }}>{py.mustahiq?.nama_lengkap}</td>
                        <td style={styles.td}>{py.kelompok?.nama_kelompok || '-'}</td>
                        <td style={styles.td}><span style={styles.tagKategori}>{py.mustahiq?.kategori}</span></td>
                        <td style={styles.td}>{py.jumlah_diterima}</td>
                        <td style={styles.td}>
                          <span style={styles.badgePenyaluran(py.status)}>{py.status}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            {py.status !== 'TERSALURKAN' && (
                              <button 
                                className="btn btn-primary" 
                                style={{ ...styles.actionBtn, padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleUpdateStatus(py.id, 'TERSALURKAN')}
                              >
                                ✓ Salurkan
                              </button>
                            )}
                            {py.status !== 'BATAL' && (
                              <button 
                                className="btn btn-outline" 
                                style={{ ...styles.actionBtn, padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                                onClick={() => handleUpdateStatus(py.id, 'BATAL')}
                              >
                                ✕ Batal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate via Kelompok Modal */}
      {showGenModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.smallModalContent}>
            <h3 style={styles.modalTitle}>Generate Otomatis per Kelompok</h3>
            <p style={styles.modalDesc}>Membuat rencana penerimaan santunan untuk semua mustahiq aktif di kelompok terpilih.</p>
            
            <form onSubmit={handleGenerateDist} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Pilih Kelompok Penerima *</label>
                <select
                  className="input"
                  value={genKelompokId}
                  onChange={(e) => setGenKelompokId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kelompok --</option>
                  {kelompokList.map(kl => (
                    <option key={kl.id} value={kl.id}>{kl.nama_kelompok} ({kl.wilayah})</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Bantuan yang Diterima *</label>
                <input
                  type="text"
                  className="input"
                  value={genJumlah}
                  onChange={(e) => setGenJumlah(e.target.value)}
                  required
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowGenModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Generate Rencana</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tableCard: {
    padding: '0px',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  tableWrapperModal: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  thRow: {
    backgroundColor: 'hsl(var(--muted))',
    borderBottom: '1px solid hsl(var(--border))',
  },
  th: {
    textAlign: 'left',
    padding: '14px 18px',
    fontWeight: '600',
    color: 'hsl(var(--muted-foreground))',
  },
  tr: {
    borderBottom: '1px solid hsl(var(--border))',
  },
  td: {
    padding: '14px 18px',
    color: 'hsl(var(--foreground))',
  },
  actionGroup: {
    display: 'flex',
    gap: '6px',
  },
  actionBtn: {
    padding: '6px 10px',
    fontSize: '12px',
  },
  tagKategori: {
    backgroundColor: 'hsl(var(--muted))',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '11px',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px',
    color: 'hsl(var(--muted-foreground))',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modalContent: {
    width: '90%',
    maxWidth: '440px',
    padding: '24px 30px',
  },
  smallModalContent: {
    width: '90%',
    maxWidth: '380px',
    padding: '24px 30px',
  },
  largeModalContent: {
    width: '90%',
    maxWidth: '850px',
    padding: '30px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid hsl(var(--border))',
    paddingBottom: '12px',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
  },
  modalDesc: {
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  statusBadge: (status) => {
    let bg = 'rgba(59, 130, 246, 0.12)';
    let color = '#3b82f6';
    if (status === 'SELESAI') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = 'hsl(var(--primary))';
    }
    return {
      backgroundColor: bg,
      color: color,
      padding: '4px 10px',
      borderRadius: '20px',
      fontWeight: '600',
      fontSize: '11px',
    };
  },
  badgePenyaluran: (status) => {
    let bg = 'rgba(245, 158, 11, 0.12)';
    let color = 'hsl(var(--accent))';
    if (status === 'TERSALURKAN') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = 'hsl(var(--primary))';
    } else if (status === 'BATAL') {
      bg = 'rgba(239, 68, 68, 0.12)';
      color = '#ef4444';
    }
    return {
      backgroundColor: bg,
      color: color,
      padding: '4px 10px',
      borderRadius: '20px',
      fontWeight: '600',
      fontSize: '11px',
    };
  },
};
