const getBaseUrl = () => {
  const { protocol, hostname, origin } = window.location;
  if (hostname.endsWith('.absenta.id') || hostname === 'absenta.id') {
    return `${origin}/api`;
  }
  const port = import.meta.env.VITE_BACKEND_PORT || '5002';
  return `${protocol}//${hostname}:${port}/api`;
};

const BASE_URL = getBaseUrl();

class ApiService {
  static getToken() {
    return localStorage.getItem('@mustahiq_jwt_token');
  }

  static getTenantId() {
    return localStorage.getItem('@mustahiq_tenant_id');
  }

  static async request(path, options = {}) {
    const token = this.getToken();
    const tenantId = this.getTenantId();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    // Handle unauthorized responses automatically
    if (response.status === 401 || response.status === 403) {
      console.warn('[API Client] Unauthorized request. Wiping token & redirecting to login...');
      localStorage.removeItem('@mustahiq_jwt_token');
      localStorage.removeItem('@mustahiq_tenant_id');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Terjadi kesalahan sistem.');
    }

    return data;
  }

  // Auth
  static async login(email, password) {
    const res = await this.request('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token) {
      localStorage.setItem('@mustahiq_jwt_token', res.token);
      localStorage.setItem('@mustahiq_tenant_id', res.user.tenant_id);
    }
    return res;
  }

  static async register(payload) {
    return this.request('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static logout() {
    localStorage.removeItem('@mustahiq_jwt_token');
    localStorage.removeItem('@mustahiq_tenant_id');
    window.location.href = '/login';
  }

  static async getMustahiq(params = {}) {
    if (typeof params === 'boolean') {
      return this.request(`/v1/mustahiq?activeOnly=${params}`);
    }

    const query = new URLSearchParams();
    if (params.activeOnly !== undefined) query.append('activeOnly', params.activeOnly);
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);
    if (params.kategori !== undefined) query.append('kategori', params.kategori);
    if (params.status !== undefined) query.append('status', params.status);
    if (params.nikStatus !== undefined) query.append('nikStatus', params.nikStatus);
    if (params.ageGroup !== undefined) query.append('ageGroup', params.ageGroup);

    const queryString = query.toString();
    return this.request(`/v1/mustahiq${queryString ? `?${queryString}` : ''}`);
  }

  static async addMustahiq(data) {
    return this.request('/v1/mustahiq', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateMustahiq(id, updates) {
    return this.request(`/v1/mustahiq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async deleteMustahiq(id) {
    return this.request(`/v1/mustahiq/${id}`, {
      method: 'DELETE',
    });
  }

  static async bulkUpdateStatusMustahiq(ids, status) {
    return this.request('/v1/mustahiq/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    });
  }

  static async bulkDeleteMustahiq(ids) {
    return this.request('/v1/mustahiq/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Excel Bulk Import & Export URLs
  static getExportExcelUrl() {
    const tenantId = this.getTenantId();
    return `${BASE_URL}/v1/mustahiq/export?tenant_id=${tenantId}`;
  }

  static getTemplateExcelUrl() {
    const tenantId = this.getTenantId();
    return `${BASE_URL}/v1/mustahiq/template?tenant_id=${tenantId}`;
  }

  static async importExcel(fileBufferOrBlob) {
    const token = this.getToken();
    const tenantId = this.getTenantId();
    const formData = new FormData();
    formData.append('file', fileBufferOrBlob);

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${BASE_URL}/v1/mustahiq/import-excel`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Import Excel gagal.');
    return data;
  }

  // Kategori CRUD
  static async getKategori(params = {}) {
    const query = new URLSearchParams();
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);

    const queryString = query.toString();
    return this.request(`/v1/kategori${queryString ? `?${queryString}` : ''}`);
  }

  static async addKategori(nama_kategori, keterangan) {
    return this.request('/v1/kategori', {
      method: 'POST',
      body: JSON.stringify({ nama_kategori, keterangan }),
    });
  }

  static async updateKategori(id, data) {
    return this.request(`/v1/kategori/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteKategori(id) {
    return this.request(`/v1/kategori/${id}`, {
      method: 'DELETE',
    });
  }

  // Kelompok CRUD & Anggota
  static async getKelompok(params = {}) {
    const query = new URLSearchParams();
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);
    if (params.wilayah !== undefined) query.append('wilayah', params.wilayah);

    const queryString = query.toString();
    return this.request(`/v1/kelompok${queryString ? `?${queryString}` : ''}`);
  }

  static async addKelompok(nama_kelompok, keterangan, wilayah) {
    return this.request('/v1/kelompok', {
      method: 'POST',
      body: JSON.stringify({ nama_kelompok, keterangan, wilayah }),
    });
  }

  static async updateKelompok(id, updates) {
    return this.request(`/v1/kelompok/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async deleteKelompok(id) {
    return this.request(`/v1/kelompok/${id}`, {
      method: 'DELETE',
    });
  }

  static async getAnggotaKelompok(kelompokId) {
    return this.request(`/v1/kelompok/${kelompokId}/anggota`);
  }

  static async addAnggotaKelompok(kelompokId, mustahiqIds) {
    return this.request(`/v1/kelompok/${kelompokId}/anggota`, {
      method: 'POST',
      body: JSON.stringify({ mustahiqIds }),
    });
  }

  static async deleteAnggotaKelompok(kelompokId, mustahiqId) {
    return this.request(`/v1/kelompok/${kelompokId}/anggota/${mustahiqId}`, {
      method: 'DELETE',
    });
  }

  // Program & Penyaluran CRUD
  static async getProgram(params = {}) {
    const query = new URLSearchParams();
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);

    const queryString = query.toString();
    return this.request(`/v1/program${queryString ? `?${queryString}` : ''}`);
  }

  static async addProgram(data) {
    return this.request('/v1/program', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateProgram(id, data) {
    return this.request(`/v1/program/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteProgram(id) {
    return this.request(`/v1/program/${id}`, {
      method: 'DELETE',
    });
  }

  static async getPenyaluran(programId, params = {}) {
    const query = new URLSearchParams();
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);
    if (params.status !== undefined) query.append('status', params.status);

    const queryString = query.toString();
    return this.request(`/v1/program/${programId}/penyaluran${queryString ? `?${queryString}` : ''}`);
  }

  static async generatePenyaluranUntukKelompok(programId, kelompokId, jumlahDiterima) {
    return this.request(`/v1/program/${programId}/penyaluran/generate-kelompok`, {
      method: 'POST',
      body: JSON.stringify({ kelompokId, jumlahDiterima }),
    });
  }

  static async addSinglePenyaluran(programId, mustahiqId, jumlahDiterima) {
    return this.request(`/v1/program/${programId}/penyaluran/add-single`, {
      method: 'POST',
      body: JSON.stringify({ mustahiqId, jumlahDiterima }),
    });
  }

  static async deletePenyaluran(penyaluranId) {
    return this.request(`/v1/program/penyaluran/${penyaluranId}`, {
      method: 'DELETE',
    });
  }

  static async bulkUpdateStatusPenyaluran(programId, ids, status) {
    return this.request(`/v1/program/${programId}/penyaluran/bulk-status`, {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    });
  }

  static async bulkDeletePenyaluran(programId, ids) {
    return this.request(`/v1/program/${programId}/penyaluran/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  static async updateStatusPenyaluran(penyaluranId, status, details = {}) {
    return this.request(`/v1/program/penyaluran/${penyaluranId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...details }),
    });
  }

  // SPJ PDF Download URL
  static getSpjPdfUrl(programId) {
    const tenantId = this.getTenantId();
    return `${BASE_URL}/v1/program/${programId}/spj-pdf?tenant_id=${tenantId}`;
  }

  // Kelompok PDF Print URLs
  static getKelompokAnggotaPrintUrl(kelompokId) {
    const tenantId = this.getTenantId();
    return `${BASE_URL}/v1/kelompok/${kelompokId}/print-anggota?tenant_id=${tenantId}`;
  }

  static getKelompokAbsensiPrintUrl(kelompokId) {
    const tenantId = this.getTenantId();
    return `${BASE_URL}/v1/kelompok/${kelompokId}/print-absensi?tenant_id=${tenantId}`;
  }

  // Tenant / School Profile
  static async getTenantProfile() {
    return this.request('/v1/tenant/profile');
  }

  static async updateTenantProfile(name, settings) {
    return this.request('/v1/tenant/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, settings }),
    });
  }

  // License Sync
  static async syncLicense() {
    return this.request('/v1/license/sync', {
      method: 'POST'
    });
  }

  // Tunnel / VPN Online Gateway
  static async getTunnelStatus() {
    return this.request('/v1/license/tunnel/status');
  }

  static async requestTunnel(subdomainSlug) {
    return this.request('/v1/license/tunnel/request', {
      method: 'POST',
      body: JSON.stringify({ subdomain_slug: subdomainSlug })
    });
  }

  static async toggleTunnel(action) {
    return this.request('/v1/license/tunnel/toggle', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  static async resetTunnel() {
    return this.request('/v1/license/tunnel/reset', {
      method: 'POST'
    });
  }

  // User Management
  static async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.paginate !== undefined) query.append('paginate', params.paginate);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.search !== undefined) query.append('search', params.search);

    const queryString = query.toString();
    return this.request(`/v1/users${queryString ? `?${queryString}` : ''}`);
  }

  static async createUser(payload) {
    return this.request('/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async updateUser(id, payload) {
    return this.request(`/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static async deleteUser(id) {
    return this.request(`/v1/users/${id}`, {
      method: 'DELETE'
    });
  }

  // System Update
  static async checkUpdate() {
    return this.request('/v1/system/update/check');
  }

  static async getUpdateStatus() {
    return this.request('/v1/system/update/status');
  }

  static async executeUpdate() {
    return this.request('/v1/system/update/execute', {
      method: 'POST'
    });
  }

  // File Upload
  static async uploadProfileImage(file) {
    const token = this.getToken();
    const tenantId = this.getTenantId();
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const response = await fetch(`${BASE_URL}/v1/tenant/profile/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mengunggah berkas.');
    return data;
  }

  static getFileUrl(relativePath) {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath;
    return BASE_URL.replace('/api', '') + relativePath;
  }
}

export default ApiService;
