import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Mustahiq() {
  const [mustahiqs, setMustahiqs] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNik, setFilterNik] = useState('');
  const [filterAgeGroup, setFilterAgeGroup] = useState('');
  const [maxAgeYatim, setMaxAgeYatim] = useState(15);

  // Pagination & Statistics state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, aktif: 0, survey: 0, tidakAktif: 0 });

  // Form Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [formData, setFormData] = useState({
    nik: '',
    nama_lengkap: '',
    kategori: '',
    jenis_kelamin: 'LAKI_LAKI',
    tanggal_lahir: '',
    alamat_lengkap: '',
    no_telepon: '',
    nama_wali: '',
    orang_tua_asuh: '',
    status: 'SURVEY',
    catatan: '',
  });

  // Profile Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMustahiq, setDetailMustahiq] = useState(null);

  // Excel Upload state
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async (page = currentPage, limit = pageSize) => {
    setLoading(true);
    try {
      const res = await ApiService.getMustahiq({
        paginate: true,
        page,
        limit,
        search,
        kategori: filterKategori,
        status: filterStatus,
        nikStatus: filterNik,
        ageGroup: filterAgeGroup
      });
      setMustahiqs(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      }
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (e) {
      console.error('Failed to load mustahiq data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load static configurations once on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const cats = await ApiService.getKategori();
        setKategoriList(cats.data || []);

        const profile = await ApiService.getTenantProfile();
        let parsedSettings = {};
        try {
          parsedSettings = typeof profile.data?.settings === 'string'
            ? JSON.parse(profile.data.settings)
            : profile.data?.settings || {};
        } catch (e) {
          parsedSettings = {};
        }
        const ageLimit = parsedSettings.rules?.max_age_yatim ?? 15;
        setMaxAgeYatim(ageLimit);
      } catch (e) {
        console.error('Failed to load configurations:', e);
      }
    };
    loadConfig();
  }, []);

  // Fetch paginated data whenever filter states or page states change
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(currentPage, pageSize);
    }, 300); // Debounce search changes
    return () => clearTimeout(handler);
  }, [currentPage, pageSize, search, filterKategori, filterStatus, filterNik, filterAgeGroup]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setFormData({
      nik: '',
      nama_lengkap: '',
      kategori: kategoriList[0]?.nama_kategori || 'DHUAFA',
      jenis_kelamin: 'LAKI_LAKI',
      tanggal_lahir: '',
      alamat_lengkap: '',
      no_telepon: '',
      nama_wali: '',
      orang_tua_asuh: '',
      status: 'SURVEY',
      catatan: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setIsEdit(true);
    setEditId(m.id);
    setFormData({
      nik: m.nik || '',
      nama_lengkap: m.nama_lengkap,
      kategori: m.kategori,
      jenis_kelamin: m.jenis_kelamin || 'LAKI_LAKI',
      tanggal_lahir: m.tanggal_lahir || '',
      alamat_lengkap: m.alamat_lengkap,
      no_telepon: m.no_telepon || '',
      nama_wali: m.nama_wali || '',
      orang_tua_asuh: m.orang_tua_asuh || '',
      status: m.status,
      catatan: m.catatan || '',
    });
    setShowModal(true);
  };

  const handleOpenDetail = (m) => {
    setDetailMustahiq(m);
    setShowDetailModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await ApiService.updateMustahiq(editId, formData);
        alert('Data mustahiq berhasil diperbarui.');
      } else {
        await ApiService.addMustahiq(formData);
        alert('Mustahiq baru berhasil ditambahkan.');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Gagal menyimpan data: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data mustahiq ini?')) return;
    try {
      await ApiService.deleteMustahiq(id);
      alert('Data mustahiq dihapus.');
      loadData();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      const m = mustahiqs.find(item => item.id === id);
      if (!m) return;
      
      const updatedData = {
        nik: m.nik || '',
        nama_lengkap: m.nama_lengkap,
        kategori: m.kategori,
        jenis_kelamin: m.jenis_kelamin || 'LAKI_LAKI',
        tanggal_lahir: m.tanggal_lahir || '',
        alamat_lengkap: m.alamat_lengkap,
        no_telepon: m.no_telepon || '',
        nama_wali: m.nama_wali || '',
        orang_tua_asuh: m.orang_tua_asuh || '',
        status: newStatus,
        catatan: m.catatan || '',
      };
      
      await ApiService.updateMustahiq(id, updatedData);
      setMustahiqs(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  // Excel Handler
  const handleExportExcel = () => {
    const url = ApiService.getExportExcelUrl();
    window.open(url, '_blank');
  };

  const handleDownloadTemplate = () => {
    const url = ApiService.getTemplateExcelUrl();
    window.open(url, '_blank');
  };

  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!excelFile) return alert('Silakan pilih file Excel.');
    
    setUploading(true);
    try {
      const res = await ApiService.importExcel(excelFile);
      alert(`Berhasil mengimpor ${res.count} data mustahiq. (${res.skipped || 0} data dengan NIK duplikat dilewati).`);
      setShowImportModal(false);
      loadData();
    } catch (err) {
      alert('Gagal mengimpor Excel: ' + err.message);
    } finally {
      setUploading(false);
      setExcelFile(null);
    }
  };

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return '-';
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} th`;
  };

  const getNumericalAge = (birthDateString) => {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Local Filter logic (handled server-side, passed as-is)
  const filteredMustahiqs = mustahiqs;

  // Calculate statistics (fetched from server)
  const totalCount = stats.total;
  const activeCount = stats.aktif;
  const surveyCount = stats.survey;
  const inactiveCount = stats.tidakAktif;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Data Penerima Zakat & Santunan</h1>
          <p style={styles.subtitle}>Kelola daftar penerima (Mustahiq) dan validasi kelayakan secara terarah</p>
        </div>
        <div style={styles.headerButtons}>
          <button className="btn btn-outline" onClick={handleExportExcel}>📥 Ekspor Excel</button>
          <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>📤 Impor Excel</button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>➕ Tambah Mustahiq</button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div style={styles.statsRow}>
        <div className="card glass" style={styles.miniStatCard}>
          <span style={styles.miniStatLabel}>Total Mustahiq</span>
          <h3 style={styles.miniStatVal}>
            {totalCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--primary))' }}>
          <span style={styles.miniStatLabel}>🟢 Status Aktif</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--primary))' }}>
            {activeCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--accent))' }}>
          <span style={styles.miniStatLabel}>🟡 Dalam Survey</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--accent))' }}>
            {surveyCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid #ef4444' }}>
          <span style={styles.miniStatLabel}>🔴 Tidak Aktif</span>
          <h3 style={{ ...styles.miniStatVal, color: '#ef4444' }}>
            {inactiveCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card glass" style={styles.toolbar}>
        <input
          type="text"
          className="input"
          placeholder="Cari NIK atau Nama Mustahiq..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.searchInput}
        />
        <select
          className="input"
          value={filterKategori}
          onChange={(e) => {
            setFilterKategori(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">Semua Kategori</option>
          {kategoriList.map(c => (
            <option key={c.id} value={c.nama_kategori}>{c.nama_kategori}</option>
          ))}
        </select>
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">Semua Status</option>
          <option value="AKTIF">AKTIF</option>
          <option value="SURVEY">SURVEY</option>
          <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
        </select>
        <select
          className="input"
          value={filterNik}
          onChange={(e) => {
            setFilterNik(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">Semua NIK</option>
          <option value="HAS_NIK">Punya NIK</option>
          <option value="NO_NIK">Tanpa NIK</option>
        </select>
        <select
          className="input"
          value={filterAgeGroup}
          onChange={(e) => {
            setFilterAgeGroup(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">Semua Umur</option>
          <option value="BALITA">Balita (0-5 th)</option>
          <option value="ANAK">Anak-anak (6-12 th)</option>
          <option value="REMAJA">Remaja (13-17 th)</option>
          <option value="DEWASA">Dewasa (&gt;=18 th)</option>
          <option value="UNKNOWN">Tidak Ada Tgl Lahir</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="card" style={styles.tableCard}>
        {loading ? (
          <div style={styles.centerText}>Memuat data...</div>
        ) : filteredMustahiqs.length === 0 ? (
          <div style={styles.centerText}>Tidak ada data mustahiq ditemukan.</div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>NIK</th>
                    <th style={styles.th}>Nama Lengkap</th>
                    <th style={styles.th}>Umur</th>
                    <th style={styles.th}>Kategori</th>
                    <th style={styles.th}>Gender</th>
                    <th style={styles.th}>No Telepon</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMustahiqs.map((m) => (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>{m.nik || '-'}</td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{m.nama_lengkap}</td>
                      <td style={styles.td}>
                        {calculateAge(m.tanggal_lahir)}
                        {(() => {
                          const ageNum = getNumericalAge(m.tanggal_lahir);
                          const isExceeded = ageNum !== null &&
                            (m.kategori || '').toUpperCase().includes('YATIM') &&
                            ageNum > maxAgeYatim;
                          return isExceeded ? (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }} title={`Melebihi batas usia yatim (${maxAgeYatim} th)`}>
                              ⚠️ Melebihi Batas
                            </span>
                          ) : null;
                        })()}
                      </td>
                      <td style={styles.td}><span style={styles.tagKategori}>{m.kategori}</span></td>
                      <td style={styles.td}>
                        {m.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : (m.jenis_kelamin === 'PEREMPUAN' ? 'Perempuan' : '-')}
                      </td>
                      <td style={styles.td}>{m.no_telepon || '-'}</td>
                       <td style={styles.td}>
                        <select
                          value={m.status}
                          onChange={(e) => handleQuickStatusChange(m.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: m.status === 'AKTIF' ? 'rgba(16, 185, 129, 0.12)' : (m.status === 'SURVEY' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                            color: m.status === 'AKTIF' ? '#10b981' : (m.status === 'SURVEY' ? '#f59e0b' : '#ef4444'),
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="AKTIF">AKTIF</option>
                          <option value="SURVEY">SURVEY</option>
                          <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button className="btn btn-outline" style={styles.actionBtn} title="Lihat Detail" onClick={() => handleOpenDetail(m)}>👁️</button>
                          <button className="btn btn-outline" style={styles.actionBtn} title="Ubah Data" onClick={() => handleOpenEdit(m)}>✏️</button>
                          <button className="btn btn-outline" style={{ ...styles.actionBtn, color: '#ef4444' }} title="Hapus Data" onClick={() => handleDelete(m.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Premium Pagination Controls Footer */}
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

      {/* Add / Edit Form Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{isEdit ? 'Ubah Data Mustahiq' : 'Tambah Mustahiq Baru'}</h3>
            <form onSubmit={handleSave} style={styles.formGrid}>
              <div style={styles.colSpan}>
                <label style={styles.label}>NIK (16 Digit)</label>
                <input
                  type="text"
                  className="input"
                  maxLength={16}
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                />
              </div>

              <div>
                <label style={styles.label}>Nama Lengkap *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Kategori Mustahiq *</label>
                <select
                  className="input"
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  required
                >
                  {kategoriList.map(c => (
                    <option key={c.id} value={c.nama_kategori}>{c.nama_kategori}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Jenis Kelamin *</label>
                <select
                  className="input"
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  required
                >
                  <option value="LAKI_LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Tanggal Lahir</label>
                <input
                  type="date"
                  className="input"
                  value={formData.tanggal_lahir}
                  onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                />
              </div>

              <div>
                <label style={styles.label}>No Telepon</label>
                <input
                  type="text"
                  className="input"
                  value={formData.no_telepon}
                  onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                />
              </div>

              <div>
                <label style={styles.label}>Status Kelayakan *</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="SURVEY">SURVEY</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
                </select>
              </div>

              <div style={styles.colSpan}>
                <label style={styles.label}>Alamat Lengkap *</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.alamat_lengkap}
                  onChange={(e) => setFormData({ ...formData, alamat_lengkap: e.target.value })}
                  required
                  style={{ resize: 'none' }}
                />
              </div>

              <div>
                <label style={styles.label}>Nama Wali / Kerabat</label>
                <input
                  type="text"
                  className="input"
                  value={formData.nama_wali}
                  onChange={(e) => setFormData({ ...formData, nama_wali: e.target.value })}
                />
              </div>

              <div>
                <label style={styles.label}>Orang Tua Asuh</label>
                <input
                  type="text"
                  className="input"
                  value={formData.orang_tua_asuh}
                  onChange={(e) => setFormData({ ...formData, orang_tua_asuh: e.target.value })}
                />
              </div>

              <div style={styles.colSpan}>
                <label style={styles.label}>Catatan Tambahan</label>
                <input
                  type="text"
                  className="input"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                />
              </div>

              <div style={{ ...styles.colSpan, ...styles.modalFooter }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-Only Profile Detail Modal */}
      {showDetailModal && detailMustahiq && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Detail Profil Penerima Manfaat</h3>
            <p style={styles.modalDesc}>Informasi lengkap data mustahiq terdaftar</p>
            
            <div style={styles.detailGrid}>
              <div style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>Data Identitas</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>NIK:</span>
                  <strong>{detailMustahiq.nik || '-'}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Nama Lengkap:</span>
                  <strong>{detailMustahiq.nama_lengkap}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Jenis Kelamin:</span>
                  <strong>{detailMustahiq.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : (detailMustahiq.jenis_kelamin === 'PEREMPUAN' ? 'Perempuan' : '-')}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Tanggal Lahir:</span>
                  <strong>{detailMustahiq.tanggal_lahir ? new Date(detailMustahiq.tanggal_lahir).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</strong>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>Kontak & Domisili</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Nomor Telepon:</span>
                  <strong>{detailMustahiq.no_telepon || '-'}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Alamat Lengkap:</span>
                  <strong>{detailMustahiq.alamat_lengkap}</strong>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>Hubungan Sosial & Pendukung</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Nama Wali:</span>
                  <strong>{detailMustahiq.nama_wali || '-'}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Orang Tua Asuh:</span>
                  <strong>{detailMustahiq.orang_tua_asuh || '-'}</strong>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailSectionTitle}>Status Kelayakan & Catatan</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Kategori Asnaf:</span>
                  <strong><span style={styles.tagKategori}>{detailMustahiq.kategori}</span></strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Status Kelayakan:</span>
                  <strong><span style={styles.badgeStatus(detailMustahiq.status)}>{detailMustahiq.status}</span></strong>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailRowLabel}>Catatan Surveyor:</span>
                  <strong>{detailMustahiq.catatan || '-'}</strong>
                </div>
              </div>
            </div>

            <div style={{ ...styles.colSpan, ...styles.modalFooter }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowDetailModal(false)}>Tutup Detail</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.smallModalContent}>
            <h3 style={styles.modalTitle}>Impor Data Mustahiq dari Excel</h3>
            <p style={styles.modalDesc}>Unggah file spreadsheet `.xlsx` berisi daftar mustahiq instansi Anda.</p>
            
            <div style={styles.templateBox}>
              <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Gunakan template resmi agar format data tidak salah:</span>
              <button type="button" className="btn btn-outline" style={{ marginTop: '8px', width: '100%', fontSize: '12px' }} onClick={handleDownloadTemplate}>
                📥 Unduh Template Spreadsheet
              </button>
            </div>

            <form onSubmit={handleImportExcel} style={styles.importForm}>
              <div>
                <label style={styles.label}>Pilih File Excel (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  required
                  style={styles.fileInput}
                />
              </div>

              <div style={styles.instructionsList}>
                <span style={{ fontWeight: '600', fontSize: '11px', color: 'hsl(var(--foreground))' }}>Aturan Pengisian Data:</span>
                <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11px', color: 'hsl(var(--muted-foreground))', lineHeight: '1.4' }}>
                  <li>Kolom NIK, Nama Lengkap, Kategori, Alamat Lengkap wajib terisi.</li>
                  <li>Kolom NIK harus berupa 16 digit angka (ditulis sebagai teks di excel).</li>
                  <li>Jenis Kelamin diisi <strong>L</strong> atau <strong>P</strong>.</li>
                  <li>Status Kelayakan diisi: <strong>AKTIF</strong>, <strong>SURVEY</strong>, atau <strong>TIDAK_AKTIF</strong>.</li>
                </ul>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowImportModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Mengunggah & Memproses...' : 'Mulai Impor'}
                </button>
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
  headerButtons: {
    display: 'flex',
    gap: '10px',
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
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '16px',
  },
  searchInput: {
    flex: 2,
  },
  filterSelect: {
    flex: 1,
  },
  tableCard: {
    padding: '0px',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
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
    transition: 'all 0.2s',
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
    cursor: 'pointer',
  },
  tagKategori: {
    backgroundColor: 'hsl(var(--muted))',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '11px',
  },
  badgeStatus: (status) => {
    let bg = 'rgba(245, 158, 11, 0.12)';
    let color = 'hsl(var(--accent))';
    if (status === 'AKTIF') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = 'hsl(var(--primary))';
    } else if (status === 'TIDAK_AKTIF') {
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
  centerText: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
    color: 'hsl(var(--muted-foreground))',
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
    maxWidth: '600px',
    padding: '24px 30px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  smallModalContent: {
    width: '90%',
    maxWidth: '440px',
    padding: '24px 30px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '6px',
  },
  modalDesc: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    marginBottom: '20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  colSpan: {
    gridColumn: 'span 2',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '500',
    color: 'hsl(var(--muted-foreground))',
    marginBottom: '4px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '8px',
    marginBottom: '16px',
  },
  detailSection: {
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  detailSectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'hsl(var(--primary))',
    margin: '0 0 4px 0',
    borderBottom: '1px solid hsl(var(--border))',
    paddingBottom: '4px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
  },
  detailRowLabel: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '11px',
    fontWeight: '500',
  },
  templateBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  instructionsList: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  importForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fileInput: {
    padding: '10px',
    border: '1px dashed hsl(var(--border))',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
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
