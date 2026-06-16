import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Kelompok() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleGroupRestriction, setSingleGroupRestriction] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [wilayahQuery, setWilayahQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedWilayah, setDebouncedWilayah] = useState('');
  const [stats, setStats] = useState({ totalGroups: 0, totalMembers: 0, averageMembers: '0' });

  // Unified Group Modal state (for Add & Edit)
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [formData, setFormData] = useState({
    nama_kelompok: '',
    wilayah: '',
    keterangan: '',
  });

  // Member management state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [allMustahiqs, setAllMustahiqs] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMustahiqIds, setSelectedMustahiqIds] = useState([]);

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedWilayah(wilayahQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [wilayahQuery]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, debouncedWilayah]);

  const loadData = async (page = currentPage, limit = pageSize, search = debouncedSearch, wilayah = debouncedWilayah) => {
    setLoading(true);
    try {
      const res = await ApiService.getKelompok({
        paginate: true,
        page,
        limit,
        search,
        wilayah
      });
      setGroups(res.data || []);
      setStats(res.stats || { totalGroups: 0, totalMembers: 0, averageMembers: '0' });
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      }

      // Load single group restriction rule from tenant profile settings
      const profile = await ApiService.getTenantProfile();
      const isRestricted = profile.data?.settings?.rules?.single_group_restriction === true;
      setSingleGroupRestriction(isRestricted);
    } catch (e) {
      console.error('Failed to load kelompok/tenant settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch, debouncedWilayah);
  }, [currentPage, pageSize, debouncedSearch, debouncedWilayah]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setEditId('');
    setFormData({
      nama_kelompok: '',
      wilayah: '',
      keterangan: '',
    });
    setShowGroupModal(true);
  };

  const handleOpenEdit = (g) => {
    setIsEdit(true);
    setEditId(g.id);
    setFormData({
      nama_kelompok: g.nama_kelompok,
      wilayah: g.wilayah || '',
      keterangan: g.keterangan || '',
    });
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!formData.nama_kelompok.trim()) return alert('Nama kelompok wajib diisi.');
    try {
      const payload = {
        nama_kelompok: formData.nama_kelompok.trim().toUpperCase(),
        wilayah: formData.wilayah.trim(),
        keterangan: formData.keterangan.trim(),
      };

      if (isEdit) {
        await ApiService.updateKelompok(editId, payload);
        alert('Data kelompok berhasil diperbarui.');
      } else {
        await ApiService.addKelompok(payload.nama_kelompok, payload.keterangan, payload.wilayah);
        alert('Kelompok baru berhasil ditambahkan.');
      }
      setShowGroupModal(false);
      loadData(currentPage, pageSize, debouncedSearch, debouncedWilayah);
    } catch (err) {
      alert('Gagal menyimpan kelompok: ' + err.message);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelompok ini? Seluruh hubungan anggota di dalamnya juga akan terhapus.')) return;
    try {
      await ApiService.deleteKelompok(id);
      alert('Kelompok berhasil dihapus.');
      loadData(currentPage, pageSize, debouncedSearch, debouncedWilayah);
    } catch (err) {
      alert('Gagal menghapus kelompok: ' + err.message);
    }
  };

  const handleOpenMembers = async (g) => {
    setSelectedGroup(g);
    setLoading(true);
    setSelectedMustahiqIds([]);
    setMemberSearch('');
    try {
      // Get current members
      const mRes = await ApiService.getAnggotaKelompok(g.id);
      setMembers(mRes.data || []);

      // Get all mustahiqs for adding new ones
      const allRes = await ApiService.getMustahiq(true); // Active only
      setAllMustahiqs(allRes.data || []);

      setShowMemberModal(true);
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddMembers = async () => {
    if (selectedMustahiqIds.length === 0) return alert('Pilih minimal satu mustahiq.');
    setLoading(true);
    try {
      await ApiService.addAnggotaKelompok(selectedGroup.id, selectedMustahiqIds);
      // Reload members
      const mRes = await ApiService.getAnggotaKelompok(selectedGroup.id);
      setMembers(mRes.data || []);
      // Reset selected list
      setSelectedMustahiqIds([]);
      // Reload groups list to update count badges in background
      loadData(currentPage, pageSize, debouncedSearch, debouncedWilayah);
    } catch (err) {
      alert('Gagal menambah anggota: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (mustahiqId) => {
    if (!confirm('Keluarkan anggota dari kelompok ini?')) return;
    try {
      await ApiService.deleteAnggotaKelompok(selectedGroup.id, mustahiqId);
      // Reload members
      const mRes = await ApiService.getAnggotaKelompok(selectedGroup.id);
      setMembers(mRes.data || []);
      // Reload groups list to update count badges in background
      loadData(currentPage, pageSize, debouncedSearch, debouncedWilayah);
    } catch (err) {
      alert('Gagal mengeluarkan anggota: ' + err.message);
    }
  };

  // Filter out mustahiqs who are already members
  const availableMustahiqs = allMustahiqs.filter(m => {
    const isMember = members.some(mem => mem.id === m.id);

    // If single group restriction is active, check if they belong to any group (m.anggota is not empty)
    let isMemberOfAnyOtherGroup = false;
    if (singleGroupRestriction) {
      isMemberOfAnyOtherGroup = m.anggota && m.anggota.length > 0;
    }

    const matchSearch = (m.nama_lengkap || '').toLowerCase().includes(memberSearch.toLowerCase());
    return !isMember && !isMemberOfAnyOtherGroup && matchSearch;
  });

  // Calculate statistics from backend stats
  const totalGroups = stats.totalGroups;
  const totalDistributed = stats.totalMembers;
  const averageMembers = totalGroups > 0 ? (totalDistributed / totalGroups).toFixed(1) : '0';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Kelompok Distribusi Zakat</h1>
          <p style={styles.subtitle}>Kelola kelompok penyaluran santunan mustahiq per wilayah kerja</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>➕ Tambah Kelompok</button>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsRow}>
        <div className="card glass" style={styles.miniStatCard}>
          <span style={styles.miniStatLabel}>Total Kelompok</span>
          <h3 style={styles.miniStatVal}>
            {totalGroups} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>wilayah</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--primary))' }}>
          <span style={styles.miniStatLabel}>👥 Total Terdistribusi</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--primary))' }}>
            {totalDistributed} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--accent))' }}>
          <span style={styles.miniStatLabel}>📊 Rata-rata Anggota</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--accent))' }}>
            {averageMembers} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa/kelompok</span>
          </h3>
        </div>
      </div>

      {/* Search Filter Toolbar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          className="input"
          placeholder="🔍 Cari nama kelompok..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <input
          type="text"
          className="input"
          placeholder="📍 Cari wilayah cakupan..."
          value={wilayahQuery}
          onChange={(e) => setWilayahQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.grid}>
        {loading && !showMemberModal && !showGroupModal ? (
          <div style={styles.centerText}>Memuat data kelompok...</div>
        ) : groups.length === 0 ? (
          <div style={styles.centerText}>
            {totalItems === 0 ? 'Belum ada kelompok terdaftar.' : 'Tidak ditemukan kelompok yang cocok.'}
          </div>
        ) : (
          groups.map(g => (
            <div className="card glass" key={g.id} style={styles.groupCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.groupName}>{g.nama_kelompok}</h3>
                <div style={styles.headerRight}>
                  <span style={styles.wilayahBadge}>{g.wilayah || 'Umum'}</span>
                  <span style={styles.countBadge}>{g._count?.anggota || 0} jiwa</span>
                </div>
              </div>
              <p style={styles.groupDesc}>{g.keterangan || 'Tidak ada keterangan.'}</p>
              
              <div style={styles.cardFooter}>
                <button className="btn btn-outline" style={styles.iconBtn} title="Ubah Info" onClick={() => handleOpenEdit(g)}>✏️ Edit</button>
                <button className="btn btn-outline" style={{ ...styles.iconBtn, color: '#ef4444' }} title="Hapus Kelompok" onClick={() => handleDeleteGroup(g.id)}>🗑️ Hapus</button>
                <button className="btn btn-primary" style={styles.actionBtn} onClick={() => handleOpenMembers(g)}>👥 Anggota</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Control Footer */}
      {!loading && groups.length > 0 && (
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
              <option value={10}>10 Kelompok</option>
              <option value={25}>25 Kelompok</option>
              <option value={50}>50 Kelompok</option>
            </select>
          </div>

          <div style={styles.paginationInfo}>
            Menampilkan <strong>{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> dari <strong>{totalItems}</strong> kelompok
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

      {/* Add / Edit Group Modal */}
      {showGroupModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{isEdit ? 'Ubah Informasi Kelompok' : 'Tambah Kelompok Baru'}</h3>
            <form onSubmit={handleSaveGroup} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Kelompok *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: KELOMPOK CIBOGO"
                  value={formData.nama_kelompok}
                  onChange={(e) => setFormData({ ...formData, nama_kelompok: e.target.value })}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Wilayah Cakupan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: RW 04 Cibogo"
                  value={formData.wilayah}
                  onChange={(e) => setFormData({ ...formData, wilayah: e.target.value })}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Keterangan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Keterangan singkat"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                />
              </div>

              <div style={styles.modalFooterStyle}>
                <button type="button" className="btn btn-outline" onClick={() => setShowGroupModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Kelompok</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.largeModalContent}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={styles.modalTitle}>Anggota Kelompok: {selectedGroup?.nama_kelompok}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => {
                      const url = ApiService.getKelompokAnggotaPrintUrl(selectedGroup.id);
                      window.open(url, '_blank');
                    }}
                  >
                    🖨️ Cetak Anggota
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => {
                      const url = ApiService.getKelompokAbsensiPrintUrl(selectedGroup.id);
                      window.open(url, '_blank');
                    }}
                  >
                    📋 Cetak Daftar Hadir
                  </button>
                </div>
              </div>
              <button className="btn btn-outline" style={styles.closeBtn} onClick={() => setShowMemberModal(false)}>❌</button>
            </div>

            <div style={styles.modalSplit}>
              {/* Left Column: Current Members */}
              <div style={styles.splitCol}>
                <h4 style={styles.sectionTitle}>Daftar Anggota ({members.length})</h4>
                <div style={styles.listContainer}>
                  {members.length === 0 ? (
                    <p style={styles.emptyText}>Belum ada anggota di kelompok ini.</p>
                  ) : (
                    members.map(m => (
                      <div key={m.id} style={styles.memberItem}>
                        <div>
                          <p style={styles.memberName}>{m.nama_lengkap}</p>
                          <span style={styles.memberTag}>{m.kategori}</span>
                        </div>
                        <button className="btn btn-outline" style={styles.removeBtn} onClick={() => handleRemoveMember(m.id)}>Keluarkan</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Add New Members */}
              <div style={styles.splitCol}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ ...styles.sectionTitle, borderBottom: 'none', paddingBottom: 0, margin: 0 }}>Tambah Anggota Baru</h4>
                  {availableMustahiqs.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', color: 'hsl(var(--muted-foreground))' }}>
                      <input
                        type="checkbox"
                        checked={availableMustahiqs.length > 0 && availableMustahiqs.every(m => selectedMustahiqIds.includes(m.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMustahiqIds(prev => {
                              const newIds = [...prev];
                              availableMustahiqs.forEach(m => {
                                if (!newIds.includes(m.id)) newIds.push(m.id);
                              });
                              return newIds;
                            });
                          } else {
                            setSelectedMustahiqIds(prev => prev.filter(id => !availableMustahiqs.some(m => m.id === id)));
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      Pilih Semua
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  className="input"
                  placeholder="Cari mustahiq..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={styles.searchBox}
                />
                <div style={styles.listContainer}>
                  {availableMustahiqs.length === 0 ? (
                    <p style={styles.emptyText}>Tidak ada mustahiq aktif yang tersedia.</p>
                  ) : (
                    availableMustahiqs.map(m => {
                      const otherGroups = m.anggota && m.anggota.length > 0
                        ? m.anggota.map(a => a.kelompok?.nama_kelompok).filter(Boolean).join(', ')
                        : null;
                      const isSelected = selectedMustahiqIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          style={{
                            ...styles.memberItem,
                            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.04)' : 'hsl(var(--card))',
                            borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setSelectedMustahiqIds(prev =>
                              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            );
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <p style={styles.memberName}>{m.nama_lengkap}</p>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span style={styles.memberTag}>{m.kategori}</span>
                                {otherGroups && (
                                  <span style={{
                                    fontSize: '10px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    color: '#f59e0b',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    📌 {otherGroups}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bulk Add Floating/Mini Panel inside Modal */}
                {selectedMustahiqIds.length > 0 && (
                  <div style={styles.floatingPanelModal}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'hsl(var(--foreground))' }}>
                      <strong>{selectedMustahiqIds.length}</strong> jiwa terpilih
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '11px', height: '30px' }}
                        onClick={() => setSelectedMustahiqIds([])}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '11px', height: '30px', fontWeight: '700' }}
                        onClick={handleBulkAddMembers}
                      >
                        ➕ Tambah Terpilih
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  groupCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '14px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  groupName: {
    fontSize: '17px',
    fontWeight: '700',
    margin: 0,
    flex: 1,
  },
  wilayahBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    fontWeight: '600',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  countBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: 'hsl(var(--primary))',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    fontWeight: '600',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  groupDesc: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.4',
    margin: 0,
    minHeight: '36px',
  },
  cardFooter: {
    marginTop: '8px',
    display: 'flex',
    gap: '8px',
  },
  iconBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  actionBtn: {
    flexGrow: 1,
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
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
    maxWidth: '400px',
    padding: '24px 30px',
  },
  largeModalContent: {
    width: '90%',
    maxWidth: '800px',
    padding: '30px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeBtn: {
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
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
  modalFooterStyle: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  modalSplit: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  splitCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'hsl(var(--foreground))',
    borderBottom: '1px solid hsl(var(--border))',
    paddingBottom: '6px',
    margin: 0,
  },
  searchBox: {
    marginBottom: '6px',
  },
  listContainer: {
    maxHeight: '350px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  memberItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: 'hsl(var(--card))',
    borderRadius: '6px',
    border: '1px solid hsl(var(--border))',
  },
  memberName: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
  },
  memberTag: {
    fontSize: '10px',
    color: 'hsl(var(--muted-foreground))',
  },
  addBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    color: '#ef4444',
    cursor: 'pointer',
  },
  emptyText: {
    textAlign: 'center',
    color: 'hsl(var(--muted-foreground))',
    fontSize: '12px',
    padding: '20px 0',
    margin: 0,
  },
  searchContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  searchInput: {
    maxWidth: '300px',
    height: '38px',
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
    marginTop: '20px',
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
  floatingPanelModal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    border: '1px solid hsl(var(--primary))',
    borderRadius: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    backdropFilter: 'blur(8px)',
    marginTop: '12px',
  },
};
