import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Kelompok() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleGroupRestriction, setSingleGroupRestriction] = useState(false);
  
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

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getKelompok();
      setGroups(res.data || []);

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
    loadData();
  }, []);

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
      loadData();
    } catch (err) {
      alert('Gagal menyimpan kelompok: ' + err.message);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelompok ini? Seluruh hubungan anggota di dalamnya juga akan terhapus.')) return;
    try {
      await ApiService.deleteKelompok(id);
      alert('Kelompok berhasil dihapus.');
      loadData();
    } catch (err) {
      alert('Gagal menghapus kelompok: ' + err.message);
    }
  };

  const handleOpenMembers = async (g) => {
    setSelectedGroup(g);
    setLoading(true);
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

  const handleAddMember = async (mustahiqId) => {
    try {
      await ApiService.addAnggotaKelompok(selectedGroup.id, [mustahiqId]);
      // Reload members
      const mRes = await ApiService.getAnggotaKelompok(selectedGroup.id);
      setMembers(mRes.data || []);
      // Reload groups list to update count badges in background
      const gRes = await ApiService.getKelompok();
      setGroups(gRes.data || []);
    } catch (err) {
      alert('Gagal menambah anggota: ' + err.message);
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
      const gRes = await ApiService.getKelompok();
      setGroups(gRes.data || []);
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

  // Calculate statistics
  const totalGroups = groups.length;
  const totalDistributed = groups.reduce((acc, g) => acc + (g._count?.anggota || 0), 0);
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

      <div style={styles.grid}>
        {loading && !showMemberModal && !showGroupModal ? (
          <div style={styles.centerText}>Memuat data kelompok...</div>
        ) : groups.length === 0 ? (
          <div style={styles.centerText}>Belum ada kelompok terdaftar.</div>
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
              <h3 style={styles.modalTitle}>Anggota Kelompok: {selectedGroup?.nama_kelompok}</h3>
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
                <h4 style={styles.sectionTitle}>Tambah Anggota Baru</h4>
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
                      return (
                        <div key={m.id} style={styles.memberItem}>
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
                          <button className="btn btn-primary" style={styles.addBtn} onClick={() => handleAddMember(m.id)}>➕ Tambah</button>
                        </div>
                      );
                    })
                  )}
                </div>
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
};
