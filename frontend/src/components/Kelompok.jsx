import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Kelompok() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add group state
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [wilayah, setWilayah] = useState('');

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
    } catch (e) {
      console.error('Failed to load kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return alert('Nama kelompok wajib diisi.');
    try {
      await ApiService.addKelompok(groupName.trim().toUpperCase(), keterangan, wilayah);
      alert('Kelompok baru berhasil ditambahkan.');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert('Gagal menambah kelompok: ' + err.message);
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
    } catch (err) {
      alert('Gagal mengeluarkan anggota: ' + err.message);
    }
  };

  // Filter out mustahiqs who are already members
  const availableMustahiqs = allMustahiqs.filter(m => {
    const isMember = members.some(mem => mem.id === m.id);
    const matchSearch = m.nama_lengkap.toLowerCase().includes(memberSearch.toLowerCase());
    return !isMember && matchSearch;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Kelompok Distribusi Zakat</h1>
          <p style={styles.subtitle}>Kelola kelompok penyaluran santunan mustahiq per wilayah kerja</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Tambah Kelompok</button>
      </div>

      <div style={styles.grid}>
        {loading && !showMemberModal ? (
          <div style={styles.centerText}>Memuat data kelompok...</div>
        ) : groups.length === 0 ? (
          <div style={styles.centerText}>Belum ada kelompok terdaftar.</div>
        ) : (
          groups.map(g => (
            <div className="card" key={g.id} style={styles.groupCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.groupName}>{g.nama_kelompok}</h3>
                <span style={styles.wilayahBadge}>{g.wilayah || 'Umum'}</span>
              </div>
              <p style={styles.groupDesc}>{g.keterangan || 'Tidak ada keterangan.'}</p>
              
              <div style={styles.cardFooter}>
                <button className="btn btn-outline" style={styles.manageBtn} onClick={() => handleOpenMembers(g)}>
                  👥 Kelola Anggota
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Tambah Kelompok Baru</h3>
            <form onSubmit={handleAddGroup} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Kelompok *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: KELOMPOK CIBOGO"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Wilayah Cakupan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: RW 04 Cibogo"
                  value={wilayah}
                  onChange={(e) => setWilayah(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Keterangan</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Keterangan singkat"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                />
              </div>

              <div style={styles.modalFooterStyle}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Batal</button>
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
              <button className="btn btn-outline" onClick={() => setShowMemberModal(false)}>❌</button>
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
                        <button className="btn btn-outline" style={styles.removeBtn} onClick={() => handleRemoveMember(m.id)}> Keluarkan</button>
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
                    availableMustahiqs.map(m => (
                      <div key={m.id} style={styles.memberItem}>
                        <div>
                          <p style={styles.memberName}>{m.nama_lengkap}</p>
                          <span style={styles.memberTag}>{m.kategori}</span>
                        </div>
                        <button className="btn btn-primary" style={styles.addBtn} onClick={() => handleAddMember(m.id)}>➕ Tambah</button>
                      </div>
                    ))
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  groupCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '14px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    fontSize: '18px',
    fontWeight: '700',
  },
  wilayahBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  groupDesc: {
    fontSize: '13px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.4',
  },
  cardFooter: {
    marginTop: '8px',
  },
  manageBtn: {
    width: '100%',
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
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
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
    gridTemplateColumns: '1fr 1fr',
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
    backgroundColor: 'hsl(var(--background))',
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
  },
  memberTag: {
    fontSize: '10px',
    color: 'hsl(var(--muted-foreground))',
  },
  addBtn: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  removeBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    color: '#ef4444',
  },
  emptyText: {
    textAlign: 'center',
    color: 'hsl(var(--muted-foreground))',
    fontSize: '12px',
    padding: '20px 0',
  },
};
