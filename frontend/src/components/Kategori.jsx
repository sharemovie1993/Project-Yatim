import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Kategori() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [namaKategori, setNamaKategori] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Category stats state
  const [categoryStats, setCategoryStats] = useState({
    totalCategories: 0,
    popularCategoryName: '-',
    maxCount: 0,
    totalMustahiqsCategorized: 0
  });

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadData = async (page = currentPage, limit = pageSize, search = debouncedSearch) => {
    setLoading(true);
    try {
      const res = await ApiService.getKategori({
        paginate: true,
        page,
        limit,
        search
      });
      setCategories(res.data || []);
      if (res.stats) {
        setCategoryStats(res.stats);
      }
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      }
    } catch (e) {
      console.error('Failed to load category data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch);
  }, [currentPage, pageSize, debouncedSearch]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setNamaKategori('');
    setKeterangan('');
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setIsEdit(true);
    setEditId(c.id);
    setNamaKategori(c.nama_kategori);
    setKeterangan(c.keterangan || '');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = namaKategori.trim().toUpperCase();
    if (!cleanName) return alert('Nama kategori wajib diisi.');

    const slugRegex = /^[A-Z0-9_]+$/;
    if (!slugRegex.test(cleanName)) {
      return alert('Nama kategori hanya boleh berisi huruf besar, angka, dan garis bawah (contoh: YATIM_NON_PANTI).');
    }

    try {
      if (isEdit) {
        await ApiService.updateKategori(editId, { nama_kategori: cleanName, keterangan });
        alert('Kategori berhasil diperbarui.');
      } else {
        await ApiService.addKategori(cleanName, keterangan);
        alert('Kategori baru berhasil ditambahkan.');
      }
      setShowModal(false);
      loadData(currentPage, pageSize, debouncedSearch);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    try {
      await ApiService.deleteKategori(id);
      alert('Kategori terhapus.');
      loadData(currentPage, pageSize, debouncedSearch);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  // Stats from backend state
  const totalCategories = categoryStats.totalCategories;
  const popularCategoryName = categoryStats.popularCategoryName;
  const maxCount = categoryStats.maxCount;
  const totalMustahiqsCategorized = categoryStats.totalMustahiqsCategorized;

  const filteredCategories = categories;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pengelola Kategori Mustahiq</h1>
          <p style={styles.subtitle}>Kelompokkan jenis penerima santunan secara dinamis langsung dari database</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>➕ Tambah Kategori</button>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsRow}>
        <div className="card glass" style={styles.miniStatCard}>
          <span style={styles.miniStatLabel}>Total Kategori</span>
          <h3 style={styles.miniStatVal}>
            {totalCategories} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>kategori</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--primary))' }}>
          <span style={styles.miniStatLabel}>🏆 Kategori Terpopuler</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--primary))' }}>
            {popularCategoryName} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>({maxCount} jiwa)</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--accent))' }}>
          <span style={styles.miniStatLabel}>👥 Mustahiq Terkategori</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--accent))' }}>
            {totalMustahiqsCategorized} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
      </div>

      {/* Search Box */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          className="input"
          placeholder="🔍 Cari nama kategori atau deskripsi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div className="card" style={styles.tableCard}>
        {loading ? (
          <div style={styles.centerText}>Memuat data kategori...</div>
        ) : filteredCategories.length === 0 ? (
          <div style={styles.centerText}>
            {categories.length === 0 ? 'Belum ada kategori terdaftar.' : 'Tidak ditemukan kategori yang cocok.'}
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Nama Kategori (Slug)</th>
                  <th style={styles.th}>Keterangan Deskripsi</th>
                  <th style={styles.th}>Jumlah Mustahiq</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700', color: 'hsl(var(--primary))' }}>
                      {c.nama_kategori}
                    </td>
                    <td style={styles.td}>{c.keterangan || '-'}</td>
                    <td style={{ ...styles.td, fontWeight: '600', color: 'hsl(var(--foreground))' }}>
                      {c.mustahiq_count || 0} jiwa
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button className="btn btn-outline" style={styles.actionBtn} onClick={() => handleOpenEdit(c)}>✏️ Edit</button>
                        <button className="btn btn-outline" style={{ ...styles.actionBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }} onClick={() => handleDelete(c.id)}>🗑️ Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && categories.length > 0 && (
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
              </select>
            </div>

            <div style={styles.paginationInfo}>
              Menampilkan <strong>{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> dari <strong>{totalItems}</strong> kategori
            </div>

            <div style={styles.paginationNav}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                style={{
                  padding: '4px 8px',
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
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '4px 8px',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
                title="Sebelumnya"
              >
                ◀️
              </button>
              
              <span style={styles.pageIndicator}>
                Hal <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '4px 8px',
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
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  padding: '4px 8px',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
                title="Halaman Terakhir"
              >
                ⏭️
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{isEdit ? 'Ubah Kategori' : 'Tambah Kategori Baru'}</h3>
            <form onSubmit={handleSave} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Kategori *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: YATIM_NON_PANTI"
                  value={namaKategori}
                  onChange={(e) => setNamaKategori(e.target.value)}
                  required
                />
                <span style={{ fontSize: '10.5px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
                  * Hanya boleh huruf besar, angka, dan garis bawah/underscore (A-Z, 0-9, _).
                </span>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Keterangan</label>
                <textarea
                  className="input"
                  placeholder="Deskripsi singkat kategori ini..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Kategori</button>
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
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '8px',
  },
  miniStatCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  miniStatLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'hsl(var(--muted-foreground))',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  miniStatVal: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
  },
  searchContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  searchInput: {
    maxWidth: '300px',
    height: '38px',
    width: '100%',
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
    maxWidth: '440px',
    padding: '24px 30px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '18px',
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
