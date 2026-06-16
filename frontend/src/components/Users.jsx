import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [userStats, setUserStats] = useState({ total: 0, admin: 0, staff: 0 });

  // Form States
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PETUGAS');
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');

  // Extract currently logged-in User ID from JWT Token to prevent self-deletion
  const getLoggedInUserId = () => {
    const token = ApiService.getToken();
    if (!token) return '';
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload).id;
    } catch (e) {
      return '';
    }
  };

  const loggedInUserId = getLoggedInUserId();

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadData = async (page = currentPage, limit = pageSize, search = debouncedSearch) => {
    setLoading(true);
    try {
      const res = await ApiService.getUsers({
        paginate: true,
        page,
        limit,
        search
      });
      setUsers(res.data || []);
      if (res.stats) {
        setUserStats(res.stats);
      }
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      }
    } catch (e) {
      console.error('Failed to load user list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage, pageSize, debouncedSearch);
  }, [currentPage, pageSize, debouncedSearch]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setUserId('');
    setName('');
    setEmail('');
    setPassword('');
    setRole('PETUGAS');
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setIsEdit(true);
    setUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setShowModal(true);
  };

  const handleOpenChangePassword = (u) => {
    setUserId(u.id);
    setNewPassword('');
    setShowPwdModal(true);
  };

  const isStrongPassword = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pwd);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return alert('Nama dan Email wajib diisi.');
    if (!isEdit && !password.trim()) return alert('Password wajib diisi.');

    if (!isEdit && !isStrongPassword(password)) {
      return alert('Kata sandi kurang kuat. Harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, serta karakter khusus (seperti @$!%*?&).');
    }

    try {
      if (isEdit) {
        await ApiService.updateUser(userId, { name, role });
        alert('Data pengguna berhasil diperbarui.');
      } else {
        await ApiService.createUser({ email, password, name, role });
        alert('Pengguna baru berhasil dibuat.');
      }
      setShowModal(false);
      loadData(currentPage, pageSize, debouncedSearch);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return alert('Password baru wajib diisi.');
    if (!isStrongPassword(newPassword)) {
      return alert('Kata sandi kurang kuat. Harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, serta karakter khusus (seperti @$!%*?&).');
    }
    try {
      await ApiService.updateUser(userId, { password: newPassword });
      alert('Password pengguna berhasil diubah.');
      setShowPwdModal(false);
    } catch (err) {
      alert('Gagal mengubah password: ' + err.message);
    }
  };

  const handleDelete = async (u) => {
    if (u.id === loggedInUserId) {
      return alert('Keamanan Terjaga: Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan saat ini.');
    }
    
    if (u.role === 'ADMIN') {
      const admins = users.filter(usr => usr.role === 'ADMIN');
      if (admins.length <= 1) {
        return alert('Keamanan Terjaga: Tidak dapat menghapus admin terakhir. Sekolah Anda wajib memiliki minimal 1 Administrator.');
      }
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${u.name}" dari sistem?`)) return;

    try {
      await ApiService.deleteUser(u.id);
      alert('Pengguna berhasil dihapus.');
      loadData(currentPage, pageSize, debouncedSearch);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  // Calculate statistics from server-side data
  const totalUsers = userStats.total;
  const adminCount = userStats.admin;
  const staffCount = userStats.staff;

  const filteredUsers = users;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manajemen Pengguna</h1>
          <p style={styles.subtitle}>Kelola Administrator dan Petugas penyaluran santunan di instansi Anda</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>➕ Tambah Pengguna</button>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsRow}>
        <div className="card glass" style={styles.miniStatCard}>
          <span style={styles.miniStatLabel}>Total Pengguna</span>
          <h3 style={styles.miniStatVal}>
            {totalUsers} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>jiwa</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--primary))' }}>
          <span style={styles.miniStatLabel}>🛡️ Administrator (ADMIN)</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--primary))' }}>
            {adminCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>akun</span>
          </h3>
        </div>
        <div className="card glass" style={{ ...styles.miniStatCard, borderLeft: '4px solid hsl(var(--accent))' }}>
          <span style={styles.miniStatLabel}>🔑 Petugas Lapangan</span>
          <h3 style={{ ...styles.miniStatVal, color: 'hsl(var(--accent))' }}>
            {staffCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>akun</span>
          </h3>
        </div>
      </div>

      {/* Search Box */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          className="input"
          placeholder="🔍 Cari nama, email, atau peran..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div className="card" style={styles.tableCard}>
        {loading ? (
          <div style={styles.centerText}>Memuat data pengguna...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.centerText}>
            {users.length === 0 ? 'Belum ada pengguna terdaftar.' : 'Tidak ditemukan pengguna yang cocok.'}
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Nama Pengguna</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Peran (Role)</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700', color: 'hsl(var(--foreground))' }}>
                      {u.name} {u.id === loggedInUserId && <span style={styles.meBadge}>Anda</span>}
                    </td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <span style={styles.roleBadge(u.role === 'ADMIN')}>
                        {u.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button 
                          className="btn btn-outline" 
                          style={styles.actionBtn} 
                          onClick={() => handleOpenEdit(u)}
                          title="Ubah data pengguna"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={styles.actionBtn} 
                          onClick={() => handleOpenChangePassword(u)}
                          title="Ganti password"
                        >
                          🔑 Sandi
                        </button>
                        {u.id !== loggedInUserId && (
                          <button 
                            className="btn btn-outline" 
                            style={{ ...styles.actionBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }} 
                            onClick={() => handleDelete(u)}
                            title="Hapus pengguna"
                          >
                            🗑️ Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length > 0 && (
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
              Menampilkan <strong>{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> dari <strong>{totalItems}</strong> pengguna
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

      {/* MODAL: ADD / EDIT USER */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{isEdit ? 'Ubah Informasi Pengguna' : 'Tambah Pengguna Baru'}</h3>
            <form onSubmit={handleSave} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nama Lengkap *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Alamat Email *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="name@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEdit}
                  required
                />
              </div>

              {!isEdit && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Kata Sandi (Password) *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', marginTop: '2px', lineHeight: '1.3' }}>
                    * Minimal 8 karakter, wajib kombinasi huruf besar (A-Z), huruf kecil (a-z), angka (0-9), dan karakter khusus (@$!%*?&).
                  </span>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Peran Pengguna (Role) *</label>
                <select 
                  className="input" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  style={{ backgroundColor: 'hsl(var(--background))' }}
                >
                  <option value="PETUGAS">PETUGAS (Input/Salur bantuan)</option>
                  <option value="ADMIN">ADMIN (Akses Penuh & Lisensi)</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Pengguna</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {showPwdModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Ubah Kata Sandi (Reset Password)</h3>
            <form onSubmit={handleResetPasswordSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Kata Sandi Baru *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Masukkan sandi baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', marginTop: '2px', lineHeight: '1.3' }}>
                  * Minimal 8 karakter, wajib kombinasi huruf besar (A-Z), huruf kecil (a-z), angka (0-9), dan karakter khusus (@$!%*?&).
                </span>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPwdModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Perbarui Sandi</button>
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
    padding: '6px 12px',
    fontSize: '11.5px',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
    color: 'hsl(var(--muted-foreground))',
  },
  meBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: 'hsl(var(--primary))',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '4px',
    padding: '1px 6px',
    marginLeft: '6px',
  },
  roleBadge: (isAdmin) => ({
    fontSize: '10px',
    fontWeight: '800',
    borderRadius: '12px',
    padding: '2px 8px',
    display: 'inline-block',
    backgroundColor: isAdmin ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
    color: isAdmin ? 'rgb(59, 130, 246)' : 'rgb(107, 114, 128)',
    border: '1px solid ' + (isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)'),
  }),
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modalContent: {
    width: '90%',
    maxWidth: '420px',
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
    fontSize: '11.5px',
    fontWeight: '600',
    color: 'hsl(var(--muted-foreground))',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
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
