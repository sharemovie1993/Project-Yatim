import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Program() {
  const [programs, setPrograms] = useState([]);
  const [kelompokList, setKelompokList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Program Search & Pagination state
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [programStats, setProgramStats] = useState({ total: 0, budget: 0, average: 0 });

  // Add & Edit Program state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [newProgram, setNewProgram] = useState({
    nama_program: '',
    tanggal_pelaksanaan: new Date().toISOString().slice(0, 10),
    jenis: 'UANG_TUNAI',
    total_anggaran: '',
    status: 'DRAFT',
  });

  // Distribution detail & pagination state
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [penyaluranList, setPenyaluranList] = useState([]);
  const [showDistModal, setShowDistModal] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [distCurrentPage, setDistCurrentPage] = useState(1);
  const [distPageSize, setDistPageSize] = useState(10);
  const [distTotalPages, setDistTotalPages] = useState(1);
  const [distTotalItems, setDistTotalItems] = useState(0);
  const [distStatus, setDistStatus] = useState('');
  const [distStats, setDistStats] = useState({ total: 0, dana: 0, tersalurkan: 0, belum: 0, batal: 0 });
  const [existingMustahiqIds, setExistingMustahiqIds] = useState([]);

  // Add single mustahiq state
  const [selectedMustahiqId, setSelectedMustahiqId] = useState('');
  const [singleJumlah, setSingleJumlah] = useState('Rp 150.000');
  const [allActiveMustahiqs, setAllActiveMustahiqs] = useState([]);

  // Generate distribution state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genKelompokId, setGenKelompokId] = useState('');
  const [genJumlah, setGenJumlah] = useState('Rp 150.000');

  const loadData = async (page = currentPage, limit = pageSize) => {
    setLoading(true);
    try {
      const res = await ApiService.getProgram({
        paginate: true,
        page,
        limit,
        search
      });
      setPrograms(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      }
      if (res.stats) {
        setProgramStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to load program data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPenyaluranData = async (programId = selectedProgram?.id, page = distCurrentPage, limit = distPageSize) => {
    if (!programId) return;
    setLoading(true);
    try {
      const res = await ApiService.getPenyaluran(programId, {
        paginate: true,
        page,
        limit,
        search: recipientSearch,
        status: distStatus
      });
      setPenyaluranList(res.data || []);
      if (res.pagination) {
        setDistTotalPages(res.pagination.totalPages || 1);
        setDistTotalItems(res.pagination.totalItems || 0);
      }
      if (res.stats) {
        setDistStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to load penyaluran data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load static configurations once on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const kel = await ApiService.getKelompok();
        setKelompokList(kel.data || []);
      } catch (e) {
        console.error('Failed to load initial configurations:', e);
      }
    };
    loadConfig();
  }, []);

  // Fetch paginated programs whenever filter states or page states change
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(currentPage, pageSize);
    }, 300); // Debounce search changes
    return () => clearTimeout(handler);
  }, [currentPage, pageSize, search]);

  // Fetch paginated penyaluran whenever filter states or page states change
  useEffect(() => {
    if (showDistModal && selectedProgram) {
      const handler = setTimeout(() => {
        loadPenyaluranData(selectedProgram.id, distCurrentPage, distPageSize);
      }, 300); // Debounce recipient search changes
      return () => clearTimeout(handler);
    }
  }, [distCurrentPage, distPageSize, recipientSearch, distStatus, showDistModal, selectedProgram]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setEditId('');
    setNewProgram({
      nama_program: '',
      tanggal_pelaksanaan: new Date().toISOString().slice(0, 10),
      jenis: 'UANG_TUNAI',
      total_anggaran: '',
      status: 'DRAFT',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setIsEdit(true);
    setEditId(p.id);
    setNewProgram({
      nama_program: p.nama_program,
      tanggal_pelaksanaan: p.tanggal_pelaksanaan,
      jenis: p.jenis,
      total_anggaran: p.total_anggaran || '',
      status: p.status || 'DRAFT',
    });
    setShowAddModal(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!newProgram.nama_program.trim()) return alert('Nama program wajib diisi.');
    try {
      const payload = {
        nama_program: newProgram.nama_program.trim(),
        tanggal_pelaksanaan: newProgram.tanggal_pelaksanaan,
        jenis: newProgram.jenis,
        total_anggaran: newProgram.total_anggaran ? parseFloat(newProgram.total_anggaran) : 0,
        status: newProgram.status,
      };

      if (isEdit) {
        await ApiService.updateProgram(editId, payload);
        alert('Program santunan berhasil diperbarui.');
      } else {
        await ApiService.addProgram(payload);
        alert('Program santunan baru berhasil dibuat.');
      }
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert('Gagal menyimpan program: ' + err.message);
    }
  };

  const handleDeleteProgram = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus program ini? Seluruh data penyaluran di dalamnya juga akan terhapus secara permanen.')) return;
    try {
      await ApiService.deleteProgram(id);
      alert('Program berhasil dihapus.');
      loadData();
    } catch (err) {
      alert('Gagal menghapus program: ' + err.message);
    }
  };

  const handleOpenDistributions = async (p) => {
    setSelectedProgram(p);
    setLoading(true);
    setRecipientSearch('');
    setDistStatus('');
    setDistCurrentPage(1);
    try {
      const res = await ApiService.getPenyaluran(p.id, {
        paginate: true,
        page: 1,
        limit: distPageSize,
        search: '',
        status: ''
      });
      setPenyaluranList(res.data || []);
      if (res.pagination) {
        setDistTotalPages(res.pagination.totalPages || 1);
        setDistTotalItems(res.pagination.totalItems || 0);
      }
      if (res.stats) {
        setDistStats(res.stats);
      }

      // Fetch all recipient IDs in this program to avoid duplicates in modal list selection
      const fullRes = await ApiService.getPenyaluran(p.id, { paginate: false });
      setExistingMustahiqIds(fullRes.data?.map(py => py.mustahiq_id) || []);
      
      const mustRes = await ApiService.getMustahiq(true); // Active only
      setAllActiveMustahiqs(mustRes.data || []);

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
      
      const fullRes = await ApiService.getPenyaluran(selectedProgram.id, { paginate: false });
      setExistingMustahiqIds(fullRes.data?.map(py => py.mustahiq_id) || []);

      loadPenyaluranData(selectedProgram.id);
      loadData();
    } catch (err) {
      alert('Gagal memproses: ' + err.message);
    }
  };

  const handleAddSingleRecipient = async (e) => {
    e.preventDefault();
    if (!selectedMustahiqId) return alert('Silakan pilih mustahiq.');
    if (!singleJumlah.trim()) return alert('Silakan masukkan jumlah bantuan.');
    try {
      await ApiService.addSinglePenyaluran(selectedProgram.id, selectedMustahiqId, singleJumlah.trim());
      alert('Mustahiq berhasil ditambahkan ke daftar penerima.');
      
      setExistingMustahiqIds(prev => [...prev, selectedMustahiqId]);
      setSelectedMustahiqId('');
      setSingleJumlah('Rp 150.000');
      
      loadPenyaluranData(selectedProgram.id);
      loadData();
    } catch (err) {
      alert('Gagal menambahkan mustahiq: ' + err.message);
    }
  };

  const handleDeleteRecipient = async (penyaluranId) => {
    if (!confirm('Keluarkan mustahiq dari daftar penerima program ini?')) return;
    try {
      const pyToDelete = penyaluranList.find(p => p.id === penyaluranId);
      await ApiService.deletePenyaluran(penyaluranId);
      alert('Penerima berhasil dikeluarkan dari program.');
      
      if (pyToDelete) {
        setExistingMustahiqIds(prev => prev.filter(id => id !== pyToDelete.mustahiq_id));
      }

      loadPenyaluranData(selectedProgram.id);
      loadData();
    } catch (err) {
      alert('Gagal mengeluarkan penerima: ' + err.message);
    }
  };

  const handleUpdateStatus = async (penyaluranId, status) => {
    try {
      await ApiService.updateStatusPenyaluran(penyaluranId, status);
      loadPenyaluranData(selectedProgram.id);
    } catch (err) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const handleDownloadPdf = (programId) => {
    const url = ApiService.getSpjPdfUrl(programId);
    window.open(url, '_blank');
  };

  // Local Filter logic for recipients (handled server-side now, passed as-is)
  const filteredPenyaluran = penyaluranList;

  // Calculate statistics for distributions (fetched from server)
  const distTotalDana = distStats.dana;

  // Calculate stats for main page (fetched from server)
  const totalPrograms = programStats.total;
  const totalBudget = programStats.budget;
  const averageBudget = programStats.average;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Program & Penyaluran Santunan</h1>
          <p style={styles.subtitle}>Kelola program bantuan sosial dan cetak berkas SPJ secara realtime</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>➕ Rancang Program</button>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsRow}>
        <div className="card glass" style={styles.miniStatCard}>
          <span style={styles.miniStatLabel}>Total Program</span>
          <h3 style={styles.miniStatVal}>
            {totalPrograms} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>agenda</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--primary))' }}>
          <span style={styles.miniStatLabel}>💰 Total Rencana Anggaran</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--primary))' }}>
            Rp {totalBudget.toLocaleString('id-ID')}
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--accent))' }}>
          <span style={styles.miniStatLabel}>📊 Rata-rata Anggaran</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--accent))' }}>
            Rp {parseInt(averageBudget, 10).toLocaleString('id-ID')} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>/program</span>
          </h3>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card glass" style={{ ...styles.toolbar, padding: '16px', marginBottom: '8px' }}>
        <input
          type="text"
          className="input"
          placeholder="Cari nama program..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={{ maxWidth: '300px' }}
        />
      </div>

      <div className="card" style={styles.tableCard}>
        {loading && !showDistModal && !showAddModal ? (
          <div style={styles.centerText}>Memuat data program...</div>
        ) : programs.length === 0 ? (
          <div style={styles.centerText}>Belum ada program dirancang.</div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Nama Program</th>
                    <th style={styles.th}>Tanggal Pelaksanaan</th>
                    <th style={styles.th}>Jenis Bantuan</th>
                    <th style={styles.th}>Total Anggaran</th>
                    <th style={styles.th}>Target Penerima</th>
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
                        <span style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>
                          {p._count?.penyaluran || 0}
                        </span> jiwa
                      </td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge(p.status)}>{p.status}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button className="btn btn-outline" style={styles.iconBtn} title="Ubah Program" onClick={() => handleOpenEdit(p)}>✏️ Edit</button>
                          <button className="btn btn-outline" style={{ ...styles.iconBtn, color: '#ef4444' }} title="Hapus Program" onClick={() => handleDeleteProgram(p.id)}>🗑️ Hapus</button>
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

            {/* Program Pagination Controls */}
            <div style={styles.paginationFooter}>
              <div style={styles.paginationLimit}>
                <span style={styles.paginationLabel}>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  style={styles.pageSizeSelect}
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>

              <div style={styles.paginationInfo}>
                Menampilkan <strong>{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> dari <strong>{totalItems}</strong> data
              </div>

              <div style={styles.paginationNav}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 10px',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Halaman Pertama"
                >
                  ⏮️
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 10px',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Sebelumnya"
                >
                  ◀️
                </button>
                
                <span style={styles.pageIndicator}>
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 10px',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Selanjutnya"
                >
                  ▶️
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 10px',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Halaman Terakhir"
                >
                  ⏭️
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Program Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{isEdit ? 'Ubah Rencana Program' : 'Rancang Program Baru'}</h3>
            <form onSubmit={handleSaveProgram} style={styles.form}>
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

              {isEdit && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Status Program</label>
                  <select
                    className="input"
                    value={newProgram.status}
                    onChange={(e) => setNewProgram({ ...newProgram, status: e.target.value })}
                    required
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SELESAI">SELESAI</option>
                  </select>
                </div>
              )}

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

            {/* Modal Stats Row */}
            <div style={styles.modalStatsRow}>
              <div style={styles.modalStatCard}>
                <span style={styles.modalStatLabel}>Total Penerima</span>
                <span style={styles.modalStatVal}>{distStats.total} jiwa</span>
              </div>
              <div style={styles.modalStatCard}>
                <span style={styles.modalStatLabel}>Dana Rencana</span>
                <span style={styles.modalStatVal}>Rp {distStats.dana.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ ...styles.modalStatCard, borderLeft: '3px solid hsl(var(--primary))' }}>
                <span style={styles.modalStatLabel}>Tersalurkan</span>
                <span style={{ ...styles.modalStatVal, color: 'hsl(var(--primary))' }}>
                  {distStats.tersalurkan} jiwa
                </span>
              </div>
              <div style={{ ...styles.modalStatCard, borderLeft: '3px solid hsl(var(--accent))' }}>
                <span style={styles.modalStatLabel}>Belum Salur</span>
                <span style={{ ...styles.modalStatVal, color: 'hsl(var(--accent))' }}>
                  {distStats.belum} jiwa
                </span>
              </div>
              <div style={{ ...styles.modalStatCard, borderLeft: '3px solid #ef4444' }}>
                <span style={styles.modalStatLabel}>Batal</span>
                <span style={{ ...styles.modalStatVal, color: '#ef4444' }}>
                  {distStats.batal} jiwa
                </span>
              </div>
            </div>

            {/* Add Single Recipient Inline Form */}
            <form onSubmit={handleAddSingleRecipient} style={styles.inlineForm}>
              <div style={{ ...styles.inputGroup, flex: 2 }}>
                <label style={styles.label}>Tambah Penerima Individu</label>
                <select
                  className="input"
                  value={selectedMustahiqId}
                  onChange={(e) => setSelectedMustahiqId(e.target.value)}
                  style={{ height: '38px', fontSize: '12px' }}
                >
                  <option value="">-- Pilih Mustahiq Aktif --</option>
                  {allActiveMustahiqs
                    .filter(m => !existingMustahiqIds.includes(m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nama_lengkap} ({m.kategori})
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Nominal Santunan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Rp 150.000"
                  value={singleJumlah}
                  onChange={(e) => setSingleJumlah(e.target.value)}
                  style={{ height: '38px', fontSize: '12px' }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 15px', fontSize: '12px' }}>
                ➕ Tambah
              </button>
            </form>

            {/* Recipient Table Toolbar */}
            <div style={styles.toolbar}>
              <h4 style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>Daftar Penerima Manfaat</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="input"
                  value={distStatus}
                  onChange={(e) => {
                    setDistStatus(e.target.value);
                    setDistCurrentPage(1);
                  }}
                  style={{ width: '130px', height: '34px', fontSize: '12px', padding: '0 8px' }}
                >
                  <option value="">Semua Status</option>
                  <option value="BELUM">BELUM</option>
                  <option value="TERSALURKAN">TERSALURKAN</option>
                  <option value="BATAL">BATAL</option>
                </select>
                <input
                  type="text"
                  className="input"
                  placeholder="Cari nama penerima..."
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value);
                    setDistCurrentPage(1);
                  }}
                  style={{ maxWidth: '200px', height: '34px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={styles.tableWrapperModal}>
              {filteredPenyaluran.length === 0 ? (
                <div style={styles.centerText}>
                  {recipientSearch ? 'Penerima tidak ditemukan.' : 'Belum ada target mustahiq. Silakan gunakan form di atas untuk menambah.'}
                </div>
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
                    {filteredPenyaluran.map(py => (
                      <tr key={py.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: '600' }}>{py.mustahiq?.nama_lengkap}</td>
                        <td style={styles.td}>{py.kelompok?.nama_kelompok || 'Manual (Individu)'}</td>
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
                            <button 
                              className="btn btn-outline" 
                              style={{ ...styles.actionBtn, padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                              title="Keluarkan dari daftar"
                              onClick={() => handleDeleteRecipient(py.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Pagination Footer */}
            <div style={styles.paginationFooter}>
              <div style={styles.paginationLimit}>
                <span style={styles.paginationLabel}>Tampilkan:</span>
                <select
                  value={distPageSize}
                  onChange={(e) => {
                    setDistPageSize(parseInt(e.target.value, 10));
                    setDistCurrentPage(1);
                  }}
                  style={styles.pageSizeSelect}
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                </select>
              </div>

              <div style={styles.paginationInfo}>
                Menampilkan <strong>{Math.min((distCurrentPage - 1) * distPageSize + 1, distTotalItems)}</strong> - <strong>{Math.min(distCurrentPage * distPageSize, distTotalItems)}</strong> dari <strong>{distTotalItems}</strong> data
              </div>

              <div style={styles.paginationNav}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDistCurrentPage(1)}
                  disabled={distCurrentPage === 1}
                  style={{
                    padding: '4px 8px',
                    opacity: distCurrentPage === 1 ? 0.4 : 1,
                    cursor: distCurrentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Halaman Pertama"
                >
                  ⏮️
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDistCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={distCurrentPage === 1}
                  style={{
                    padding: '4px 8px',
                    opacity: distCurrentPage === 1 ? 0.4 : 1,
                    cursor: distCurrentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Sebelumnya"
                >
                  ◀️
                </button>
                
                <span style={styles.pageIndicator}>
                  Hal <strong>{distCurrentPage}</strong> dari <strong>{distTotalPages}</strong>
                </span>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDistCurrentPage(prev => Math.min(prev + 1, distTotalPages))}
                  disabled={distCurrentPage === distTotalPages}
                  style={{
                    padding: '4px 8px',
                    opacity: distCurrentPage === distTotalPages ? 0.4 : 1,
                    cursor: distCurrentPage === distTotalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Selanjutnya"
                >
                  ▶️
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDistCurrentPage(distTotalPages)}
                  disabled={distCurrentPage === distTotalPages}
                  style={{
                    padding: '4px 8px',
                    opacity: distCurrentPage === distTotalPages ? 0.4 : 1,
                    cursor: distCurrentPage === distTotalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Halaman Terakhir"
                >
                  ⏭️
                </button>
              </div>
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
    flexWrap: 'wrap',
    gap: '12px',
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
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '8px',
  },
  miniStatCard: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  miniStatLabel: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    fontWeight: '500',
  },
  miniStatVal: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
  },
  tableCard: {
    padding: '0px',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  tableWrapperModal: {
    maxHeight: '350px',
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
    alignItems: 'center',
    gap: '6px',
  },
  iconBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  actionBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
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
    width: '95%',
    maxWidth: '850px',
    padding: '30px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
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
    margin: 0,
  },
  modalDesc: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    marginTop: '4px',
    margin: 0,
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
  inlineForm: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    padding: '15px',
    borderRadius: '8px',
    border: '1px dashed hsl(var(--border))',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '12px',
  },
  modalStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },
  modalStatCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalStatLabel: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
    fontWeight: '500',
  },
  modalStatVal: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'hsl(var(--foreground))',
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
  paginationFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderTop: '1px solid hsl(var(--border))',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  paginationLimit: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paginationLabel: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
  },
  pageSizeSelect: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid hsl(var(--border))',
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    outline: 'none',
    cursor: 'pointer',
  },
  paginationInfo: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
  },
  paginationNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageIndicator: {
    fontSize: '12px',
    margin: '0 8px',
    color: 'hsl(var(--muted-foreground))',
  },
};
