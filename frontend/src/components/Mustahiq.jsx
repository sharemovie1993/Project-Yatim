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

  // Excel Upload state
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getMustahiq();
      setMustahiqs(res.data || []);
      
      const cats = await ApiService.getKategori();
      setKategoriList(cats.data || []);
    } catch (e) {
      console.error('Failed to load mustahiq data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Excel Handler
  const handleExportExcel = () => {
    const url = ApiService.getExportExcelUrl();
    window.open(url, '_blank');
  };

  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!excelFile) return alert('Silakan pilih file Excel.');
    
    setUploading(true);
    try {
      const res = await ApiService.importExcel(excelFile);
      alert(`Berhasil mengimpor ${res.count} data mustahiq dari Excel.`);
      setShowImportModal(false);
      loadData();
    } catch (err) {
      alert('Gagal mengimpor Excel: ' + err.message);
    } finally {
      setUploading(false);
      setExcelFile(null);
    }
  };

  // Local Filter logic
  const filteredMustahiqs = mustahiqs.filter(m => {
    const matchSearch = m.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || 
                        (m.nik && m.nik.includes(search));
    const matchKat = filterKategori ? m.kategori === filterKategori : true;
    const matchStat = filterStatus ? m.status === filterStatus : true;
    return matchSearch && matchKat && matchStat;
  });

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

      {/* Filter Toolbar */}
      <div className="card glass" style={styles.toolbar}>
        <input
          type="text"
          className="input"
          placeholder="Cari NIK atau Nama Mustahiq..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          className="input"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
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
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Semua Status</option>
          <option value="AKTIF">AKTIF</option>
          <option value="SURVEY">SURVEY</option>
          <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="card" style={styles.tableCard}>
        {loading ? (
          <div style={styles.centerText}>Memuat data...</div>
        ) : filteredMustahiqs.length === 0 ? (
          <div style={styles.centerText}>Tidak ada data mustahiq ditemukan.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>NIK</th>
                  <th style={styles.th}>Nama Lengkap</th>
                  <th style={styles.th}>Kategori</th>
                  <th style={styles.th}>No Telepon</th>
                  <th style={styles.th}>Alamat</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredMustahiqs.map((m) => (
                  <tr key={m.id} style={styles.tr}>
                    <td style={styles.td}>{m.nik || '-'}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{m.nama_lengkap}</td>
                    <td style={styles.td}><span style={styles.tagKategori}>{m.kategori}</span></td>
                    <td style={styles.td}>{m.no_telepon || '-'}</td>
                    <td style={styles.td}>{m.alamat_lengkap}</td>
                    <td style={styles.td}>
                      <span style={styles.badgeStatus(m.status)}>{m.status}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button className="btn btn-outline" style={styles.actionBtn} onClick={() => handleOpenEdit(m)}>✏️</button>
                        <button className="btn btn-outline" style={{ ...styles.actionBtn, color: '#ef4444' }} onClick={() => handleDelete(m.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Excel Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.smallModalContent}>
            <h3 style={styles.modalTitle}>Impor Data Mustahiq dari Excel</h3>
            <p style={styles.modalDesc}>Unggah file spreadsheet `.xlsx` berisi daftar mustahiq instansi Anda.</p>
            
            <form onSubmit={handleImportExcel} style={styles.importForm}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setExcelFile(e.target.files[0])}
                required
                style={styles.fileInput}
              />
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
  toolbar: {
    display: 'flex',
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
  },
};
