import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const LICENSE_SERVER_URL = 'https://api.absenta.id';

const formatPrice = (price) => {
  if (!price) return 'Rp 0';
  if (typeof price === 'string') {
    if (price.startsWith('Rp')) {
      return price;
    }
    return `Rp ${price}`;
  }
  return `Rp ${price.toLocaleString('id-ID')}`;
};

const getLimitInfo = (pkg) => {
  if (!pkg) return { mustahiq: '', storage: '' };
  if (pkg.product_id === 'vpn-tunnel' || (pkg.id && pkg.id.includes('vpn'))) {
    const dur = pkg.duration || '30 Hari';
    return {
      mustahiq: 'Bandwidth Tanpa Batas',
      storage: `Masa Aktif: ${dur}`
    };
  }
  if (pkg.device_limit === 100 || (pkg.id && pkg.id.includes('basic'))) {
    return {
      mustahiq: 'Maks. 100 Mustahiq',
      storage: '1 GB Bukti Foto'
    };
  }
  if (pkg.device_limit === 500 || (pkg.id && pkg.id.includes('pro'))) {
    return {
      mustahiq: 'Maks. 500 Mustahiq',
      storage: '5 GB Bukti Foto'
    };
  }
  return {
    mustahiq: 'Tanpa Batas Mustahiq',
    storage: '25 GB Bukti Foto'
  };
};

const getPlanFromDetails = (schoolName, deviceLimit) => {
  const name = (schoolName || '').toLowerCase();
  if (name.includes('vpn') || name.includes('tunnel')) {
    if (name.includes('tahun') || name.includes('annual')) {
      return {
        title: 'VPN Tunneling Tahunan',
        price: 480000,
        mustahiq: 'Bandwidth Tanpa Batas',
        storage: 'Masa Aktif: 365 Hari'
      };
    }
    if (name.includes('sem') || name.includes('semester')) {
      return {
        title: 'VPN Tunneling Semester',
        price: 250000,
        mustahiq: 'Bandwidth Tanpa Batas',
        storage: 'Masa Aktif: 180 Hari'
      };
    }
    return {
      title: 'VPN Tunneling Bulanan',
      price: 50000,
      mustahiq: 'Bandwidth Tanpa Batas',
      storage: 'Masa Aktif: 30 Hari'
    };
  }
  if (name.includes('basic') || deviceLimit === 100) {
    return {
      title: 'Mustahiq Care Basic (Lifetime)',
      price: 999000,
      mustahiq: 'Maks. 100 Mustahiq',
      storage: '1 GB Bukti Foto'
    };
  }
  if (name.includes('pro') || deviceLimit === 500) {
    return {
      title: 'Mustahiq Care Pro (Lifetime)',
      price: 1999000,
      mustahiq: 'Maks. 500 Mustahiq',
      storage: '5 GB Bukti Foto'
    };
  }
  return {
    title: 'Mustahiq Care Enterprise (Lifetime)',
    price: 4999000,
    mustahiq: 'Tanpa Batas Mustahiq',
    storage: '25 GB Bukti Foto'
  };
};

export default function Billing() {
  const isPublicConnection = window.location.hostname.endsWith('.absenta.id') || window.location.hostname === 'absenta.id';
  const [tenant, setTenant] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [vpnLicenseKey, setVpnLicenseKey] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('app'); // 'app' | 'vpn'
  const [includeVpnAddon, setIncludeVpnAddon] = useState(false);
  const [loading, setLoading] = useState(true);

  // Billing states
  const [packages, setPackages] = useState([]);
  const [paymentChannels, setPaymentChannels] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [requesting, setRequesting] = useState(false);

  // Pending payment states
  const [pendingKey, setPendingKey] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Active / Last successful invoice receipt state
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Custom alert / confirmation dialog state
  const [dialog, setDialog] = useState(null);

  // Tunnel / VPN Online Gateway states
  const [tunnelStatus, setTunnelStatus] = useState({
    is_configured: false,
    status: 'not_configured',
    client_ip: '',
    subdomain: '',
    tunnel_active: false
  });
  const [loadingTunnel, setLoadingTunnel] = useState(false);
  const [togglingTunnel, setTogglingTunnel] = useState(false);
  const [requestingTunnel, setRequestingTunnel] = useState(false);
  const [historyLicenses, setHistoryLicenses] = useState([]);
  const [historyInvoices, setHistoryInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState('licenses');

  // Modern UI UX states
  const [hoveredCard, setHoveredCard] = useState(null);
  const [copiedVa, setCopiedVa] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  const showAlert = (message) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        message,
        onConfirm: () => {
          setDialog(null);
          resolve();
        }
      });
    });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        message,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  };

  const loadTunnelStatus = async () => {
    setLoadingTunnel(true);
    try {
      const res = await ApiService.getTunnelStatus();
      if (res.success && res.data) {
        setTunnelStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load tunnel status:', err);
    } finally {
      setLoadingTunnel(false);
    }
  };

  const triggerTunnelProvisioning = async (slug, bypassConfirm = false) => {
    if (!bypassConfirm) {
      const confirmed = await showConfirm(
        `Apakah Anda yakin ingin mengaktifkan Online Gateway dengan subdomain http://${slug}.absenta.id?`
      );
      if (!confirmed) return;
    }

    setRequestingTunnel(true);
    try {
      const res = await ApiService.requestTunnel(slug);
      if (res.success) {
        // Automatically start the tunnel connection
        const startRes = await ApiService.toggleTunnel('start');
        if (startRes.success) {
          await showAlert('Online Gateway (VPN Tunnel) berhasil diaktifkan secara otomatis!');
        } else {
          await showAlert('Konfigurasi VPN Tunnel berhasil dibuat, namun gagal mengaktifkan koneksi secara otomatis: ' + startRes.error);
        }
        await loadTunnelStatus();
      } else {
        await showAlert(res.error || 'Gagal merequest konfigurasi tunnel.');
      }
    } catch (err) {
      await showAlert('Gagal mengaktifkan gateway otomatis: ' + err.message);
    } finally {
      setRequestingTunnel(false);
    }
  };

  const handleRequestTunnel = async () => {
    if (!vpnLicenseKey) {
      await showAlert('Harap masukkan/simpan kunci lisensi VPN terlebih dahulu.');
      return;
    }
    if (!tenant?.domain_or_slug) {
      await showAlert('Subdomain sekolah belum dikonfigurasi.');
      return;
    }
    await triggerTunnelProvisioning(tenant.domain_or_slug, false);
  };

  const handleToggleTunnel = async (action) => {
    if (action === 'stop') {
      if (isPublicConnection) {
        await showAlert('Aksi Ditolak: Anda tidak dapat menonaktifkan Online Gateway ketika mengakses via domain publik.');
        return;
      }
    }

    setTogglingTunnel(true);
    try {
      const res = await ApiService.toggleTunnel(action);
      if (res.success) {
        await showAlert(res.message || 'Status koneksi tunnel berhasil diubah.');
        await loadTunnelStatus();
      } else {
        await showAlert(res.error || 'Gagal mengubah status koneksi tunnel.');
      }
    } catch (err) {
      await showAlert('Terjadi kesalahan: ' + err.message);
    } finally {
      setTogglingTunnel(false);
    }
  };

  const handleResetTunnel = async () => {
    const confirmed = await showConfirm(
      "Apakah Anda yakin ingin menghapus seluruh konfigurasi tunneling dan lisensi VPN ini?\n\n" +
      "Aksi ini akan mematikan koneksi VPN, menghapus file WireGuard, dan mengosongkan lisensi VPN di database."
    );
    if (!confirmed) return;

    try {
      const res = await ApiService.resetTunnel();
      if (res.success) {
        await showAlert('Konfigurasi dan lisensi VPN berhasil di-reset sampai bersih.');
        setVpnLicenseKey('');
        await loadData();
        await loadTunnelStatus();
      } else {
        await showAlert(res.error || 'Gagal mereset konfigurasi.');
      }
    } catch (err) {
      await showAlert('Gagal mereset konfigurasi: ' + err.message);
    }
  };

  const loadPackages = async (prodId) => {
    try {
      const pkgRes = await fetch(`${LICENSE_SERVER_URL}/api/license/packages?product_id=${prodId}`);
      const pkgData = await pkgRes.json();
      if (pkgData.success) {
        setPackages(pkgData.data || []);
        if (pkgData.data?.length > 0) {
          setSelectedPackage(pkgData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  const loadHistory = async (coreKey) => {
    if (!coreKey) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`);
      const result = await res.json();
      if (result.success) {
        setHistoryLicenses(result.data.licenses || []);
        setHistoryInvoices(result.data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadData = async () => {
    try {
      const profile = await ApiService.getTenantProfile();
      setTenant(profile.data);
      if (profile.data?.license_key) {
        setLicenseKey(profile.data.license_key);
        loadHistory(profile.data.license_key);
      }
      if (profile.data?.settings?.vpn_license_key) {
        setVpnLicenseKey(profile.data.settings.vpn_license_key);
      } else if (profile.data?.settings?.license_token) {
        try {
          const parts = profile.data.settings.license_token.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(atob(parts[1]));
            if (decoded && (decoded.include_vpn || decoded.vpn_enabled)) {
              setVpnLicenseKey(profile.data.license_key || '');
            }
          }
        } catch (e) {}
      }

      // Fetch payment channels
      const chanRes = await fetch(`${LICENSE_SERVER_URL}/api/license/payment-channels`);
      const chanData = await chanRes.json();
      if (chanData.success) {
        setPaymentChannels(chanData.data || []);
        if (chanData.data?.length > 0) {
          setSelectedChannel(chanData.data[0].code);
        }
      }

      // Fetch invoices from the license server if key exists
      let key = profile.data?.license_key || localStorage.getItem('@license_pending_key') || '';
      let serverPaidInvoice = null;
      if (key) {
        try {
          const invRes = await fetch(`${LICENSE_SERVER_URL}/api/license/my-invoices/${key}`);
          const invData = await invRes.json();
          if (invData.success && Array.isArray(invData.data) && invData.data.length > 0) {
            const latestPaid = invData.data.find(inv => inv.status === 'paid');
            const latestPending = invData.data.find(inv => inv.status === 'unpaid');
            
            if (latestPaid) {
              serverPaidInvoice = latestPaid;
              setActiveInvoice(latestPaid);
              localStorage.setItem('@license_active_invoice', JSON.stringify(latestPaid));
            } else if (latestPending) {
              const mappedPending = {
                ...latestPending,
                school_name: latestPending.school_name,
                device_limit: latestPending.device_limit || 99999,
                plan_id: latestPending.plan_title
              };
              setPaymentDetails(mappedPending);
              localStorage.setItem('@license_pending_invoice', JSON.stringify(mappedPending));
              localStorage.setItem('@license_pending_key', key);
              setPendingKey(key);
            }
          }
        } catch (err) {
          console.error('Failed to load invoices from license server:', err);
        }
      }

      // Load cached active/paid invoice receipt as fallback
      const storedActive = localStorage.getItem('@license_active_invoice');
      if (storedActive && !serverPaidInvoice) {
        try {
          setActiveInvoice(JSON.parse(storedActive));
        } catch (e) {}
      }

      // Load tunnel status
      await loadTunnelStatus();
    } catch (e) {
      console.error('Failed to load billing configuration:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const storedPending = localStorage.getItem('@license_pending_key');
    if (storedPending) {
      setPendingKey(storedPending);
      const storedInvoice = localStorage.getItem('@license_pending_invoice');
      if (storedInvoice) {
        try {
          setPaymentDetails(JSON.parse(storedInvoice));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    loadPackages(selectedProduct === 'vpn' ? 'vpn-tunnel' : 'project-yatim');
  }, [selectedProduct]);

  // Poll status every 5 seconds when there is a pending invoice
  useEffect(() => {
    if (!pendingKey) return;

    // Initial check (non-silent)
    fetchPaymentDetails(pendingKey, false);

    const intervalId = setInterval(() => {
      fetchPaymentDetails(pendingKey, true); // silent check in background
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pendingKey]);

  const handleSyncLicense = async () => {
    setSyncing(true);
    try {
      const res = await ApiService.syncLicense();
      await showAlert(res.message || 'Sinkronisasi lisensi berhasil.');
      await loadData();
    } catch (err) {
      await showAlert('Gagal sinkronisasi lisensi: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveLicenseKey = async () => {
    if (!licenseKey.trim()) {
      await showAlert('Masukkan kunci lisensi.');
      return;
    }
    try {
      await ApiService.updateTenantProfile(null, { license_key: licenseKey.trim() });
      await showAlert('Kunci lisensi berhasil disimpan. Silakan lakukan sinkronisasi untuk mengaktifkan.');
      await loadData();
    } catch (err) {
      await showAlert('Gagal menyimpan lisensi: ' + err.message);
    }
  };

  const handleSaveVpnLicenseKey = async () => {
    if (!vpnLicenseKey.trim()) {
      await showAlert('Masukkan kunci lisensi VPN.');
      return;
    }
    try {
      await ApiService.updateTenantProfile(null, { vpn_license_key: vpnLicenseKey.trim() });
      await showAlert('Kunci lisensi VPN berhasil disimpan.');
      await loadData();
    } catch (err) {
      await showAlert('Gagal menyimpan lisensi VPN: ' + err.message);
    }
  };

  const handleRequestLicense = async (e) => {
    e.preventDefault();
    if (!schoolNameInput.trim()) {
      await showAlert('Nama sekolah wajib diisi.');
      return;
    }
    
    setRequesting(true);
    const activePack = packages.find(p => p.id === selectedPackage);
    
    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/api/license/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: `${schoolNameInput.trim()} (${activePack?.title || 'Unlimited'})`,
          device_limit: activePack ? activePack.device_limit : 99999,
          is_unlimited: activePack ? activePack.is_unlimited : 1,
          product_id: selectedProduct === 'vpn' ? 'vpn-tunnel' : 'project-yatim',
          plan_id: selectedPackage,
          payment_method: selectedChannel,
          requested_slug: tenant?.domain_or_slug || null,
          include_vpn: selectedProduct === 'app' ? includeVpnAddon : false
        })
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        const key = data.data.license_key;
        const pendingInvoiceWithDetails = {
          ...data.data,
          school_name: `${schoolNameInput.trim()} (${activePack?.title || 'Unlimited'})`,
          device_limit: activePack ? activePack.device_limit : 99999,
          plan_id: selectedPackage
        };
        localStorage.setItem('@license_pending_key', key);
        localStorage.setItem('@license_pending_invoice', JSON.stringify(pendingInvoiceWithDetails));
        setPendingKey(key);
        setPaymentDetails(pendingInvoiceWithDetails);
        fetchPaymentDetails(key);
      } else {
        await showAlert(data.message || 'Gagal memproses pengajuan lisensi.');
      }
    } catch (err) {
      await showAlert('Kesalahan jaringan. Gagal menghubungi server lisensi.');
    } finally {
      setRequesting(false);
    }
  };

  const fetchPaymentDetails = async (key, silent = false) => {
    if (!silent) setLoadingPayment(true);
    const cachedInvoiceStr = localStorage.getItem('@license_pending_invoice');
    let invoiceData = null;
    if (cachedInvoiceStr) {
      try {
        invoiceData = JSON.parse(cachedInvoiceStr);
        setPaymentDetails(invoiceData);
      } catch (e) {}
    }

    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/api/license/check/${key}?device_id=DEV-WEB`);
      const data = await res.json();
      
      if (data.success) {
        const licenseDetails = data.data || {};
        const status = licenseDetails.status || data.status;
        const token = licenseDetails.token || data.token;
        const isActive = licenseDetails.is_active === 1 || status === 'active';

        if (isActive) {
          const isVpnProduct = licenseDetails.product_id === 'vpn-tunnel';
          if (isVpnProduct) {
            await ApiService.updateTenantProfile(null, { vpn_license_key: key });
            setVpnLicenseKey(key);
          } else {
            const profilePayload = { license_key: key };
            if (licenseDetails.include_vpn || licenseDetails.vpn_enabled) {
              profilePayload.vpn_license_key = key;
              setVpnLicenseKey(key);
            }
            await ApiService.updateTenantProfile(null, profilePayload);
            await ApiService.syncLicense();
          }
          
          // Cache the invoice as active receipt
          const plan = getPlanFromDetails(licenseDetails.school_name, licenseDetails.device_limit);
          if (invoiceData) {
            const updatedInvoice = {
              ...invoiceData,
              school_name: invoiceData.school_name || licenseDetails.school_name,
              amount: invoiceData.amount || plan.price
            };
            localStorage.setItem('@license_active_invoice', JSON.stringify(updatedInvoice));
          } else {
            localStorage.setItem('@license_active_invoice', JSON.stringify({
              license_key: key,
              school_name: licenseDetails.school_name,
              amount: plan.price,
              payment_method: 'QRIS / Virtual Account',
              invoice_number: 'INV-' + key.split('-').join('').slice(0, 8).toUpperCase(),
              expired_time: Math.floor(Date.now() / 1000)
            }));
          }
          
          localStorage.removeItem('@license_pending_key');
          localStorage.removeItem('@license_pending_invoice');
          setPendingKey('');
          setPaymentDetails(null);
          
          if (isVpnProduct) {
            await loadData();
            const slug = licenseDetails.requested_slug || tenant?.domain_or_slug;
            if (slug) {
              await triggerTunnelProvisioning(slug, true);
            } else {
              await showAlert('Pembayaran Berhasil! Lisensi VPN Anda telah aktif. Silakan aktifkan Online Gateway di panel kiri.');
            }
          } else {
            await showAlert('Pembayaran Berhasil! Lisensi Anda telah aktif.');
            await loadData();
          }
        } else {
          if (invoiceData) {
            setPaymentDetails(invoiceData);
          } else if (status === 'pending') {
            setPaymentDetails(licenseDetails);
          }
        }
      } else {
        localStorage.removeItem('@license_pending_key');
        localStorage.removeItem('@license_pending_invoice');
        setPendingKey('');
        setPaymentDetails(null);
      }
    } catch (err) {
      console.error('Failed to poll payment status:', err);
    } finally {
      if (!silent) setLoadingPayment(false);
    }
  };

  const handleCancelPayment = async () => {
    const confirmed = await showConfirm('Apakah Anda yakin ingin membatalkan invoice ini?');
    if (!confirmed) return;
    localStorage.removeItem('@license_pending_key');
    localStorage.removeItem('@license_pending_invoice');
    setPendingKey('');
    setPaymentDetails(null);
  };

  const handlePrintQris = () => {
    if (!paymentDetails || !paymentDetails.qr_url) return;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      showAlert('Gagal membuka jendela cetak. Pastikan pop-up dibolehkan di browser Anda.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QRIS Pembayaran - Mustahiq Care</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              text-align: center;
              color: #1f2937;
            }
            .title { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
            .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
            .amount-box {
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              padding: 16px 24px;
              border-radius: 12px;
              margin-bottom: 24px;
              display: inline-block;
            }
            .amount-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a; font-weight: bold; }
            .amount-val { font-size: 32px; font-weight: 900; color: #15803d; margin-top: 4px; }
            .qr-image { width: 280px; height: 280px; object-fit: contain; border: 1px solid #e5e7eb; padding: 12px; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .info { font-size: 12px; color: #6b7280; margin-top: 20px; max-width: 380px; line-height: 1.5; }
            @media print {
              .no-print { display: none; }
            }
            .btn {
              background-color: #10b981;
              color: white;
              border: none;
              padding: 10px 24px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              margin-top: 24px;
              box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
            }
          </style>
        </head>
        <body>
          <div class="title">QRIS Pembayaran Lisensi</div>
          <div class="subtitle">${paymentDetails.school_name || ''}</div>
          <div class="amount-box">
            <div class="amount-label">Total Nominal Tagihan</div>
            <div class="amount-val">${formatPrice(paymentDetails.amount)}</div>
          </div>
          <div>
            <img class="qr-image" src="${paymentDetails.qr_url}" alt="QRIS Code" />
          </div>
          <div class="info">Silakan scan kode QRIS di atas dengan aplikasi mobile banking atau e-wallet (Gopay, OVO, Dana, LinkAja, dll.) Anda untuk melakukan pembayaran otomatis.</div>
          <button class="btn no-print" onclick="window.print()">Cetak Sekarang</button>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQris = async () => {
    if (!paymentDetails || !paymentDetails.qr_url) return;
    try {
      const response = await fetch(paymentDetails.qr_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRIS-Invoice-${paymentDetails.invoice_number || 'Billing'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const a = document.createElement('a');
      a.href = paymentDetails.qr_url;
      a.target = '_blank';
      a.download = `QRIS-Invoice-${paymentDetails.invoice_number || 'Billing'}.png`;
      a.click();
    }
  };

  const handlePrintInvoice = (invoice, isPaid = true) => {
    if (!invoice || !invoice.invoice_number) {
      showAlert('Detail invoice/kuitansi tidak ditemukan.');
      return;
    }
    const url = `${LICENSE_SERVER_URL}/api/license/print-invoice/${invoice.invoice_number}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div style={styles.centerText}>Memuat status lisensi & billing...</div>;
  }

  const expiryDateStr = tenant?.settings?.license_expires_at || '';
  let daysRemaining = 0;
  if (expiryDateStr) {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diff = expiry.getTime() - today.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));
  }

  // Calculate dynamic stats
  const activeCoreCount = (expiryDateStr && daysRemaining > 0) ? 1 : 0;
  const activeVpnCount = (vpnLicenseKey && (tunnelStatus.status === 'connected' || tunnelStatus.status === 'disconnected' || tunnelStatus.status === 'installed')) ? 1 : 0;
  const totalActiveLicenses = historyLicenses.length > 0 
    ? historyLicenses.filter(lic => lic.is_active === 1 && lic.status === 'active').length 
    : (activeCoreCount + activeVpnCount);

  return (
    <div style={styles.container}>
      {/* Custom Alert/Confirm Dialog */}
      {dialog && (
        <div style={styles.dialogOverlay}>
          <div className="card" style={styles.dialogBox}>
            <div style={styles.dialogIcon}>
              {dialog.type === 'confirm' ? '⚠️' : dialog.message.toLowerCase().includes('berhasil') ? '✅' : 'ℹ️'}
            </div>
            <p style={styles.dialogMessage}>{dialog.message}</p>
            <div style={styles.dialogButtons}>
              {dialog.type === 'confirm' && (
                <button 
                  className="btn btn-outline" 
                  style={styles.dialogCancelBtn}
                  onClick={dialog.onCancel}
                >
                  Batal
                </button>
              )}
              <button 
                className="btn btn-primary" 
                style={styles.dialogConfirmBtn}
                onClick={dialog.onConfirm}
              >
                {dialog.type === 'confirm' ? 'Ya, Yakin' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>Lisensi & Billing Tagihan</h1>
        <p style={styles.subtitle}>Kelola status langganan aplikasi Mustahiq Care, update kunci lisensi, dan lunasi tagihan pembayaran</p>
      </div>

      {/* Modern Stats Banner */}
      <div style={styles.statsGrid}>
        <div 
          style={{
            ...styles.statsCard,
            transform: hoveredCard === 'lic' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredCard === 'lic' ? '0 10px 20px -5px rgba(0, 0, 0, 0.08)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
          onMouseEnter={() => setHoveredCard('lic')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statsIconWrapper('emerald')}>
            <span style={{ fontSize: '20px' }}>🔑</span>
          </div>
          <div style={styles.statsInfo}>
            <span style={styles.statsLabel}>Lisensi Aktif</span>
            <strong style={styles.statsValue}>{totalActiveLicenses} Aktif</strong>
            <span style={styles.statsDesc}>
              Core App: {activeCoreCount > 0 ? 'Aktif' : 'Nonaktif'} | VPN: {activeVpnCount > 0 ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
        
        <div 
          style={{
            ...styles.statsCard,
            transform: hoveredCard === 'vpn' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredCard === 'vpn' ? '0 10px 20px -5px rgba(0, 0, 0, 0.08)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
          onMouseEnter={() => setHoveredCard('vpn')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statsIconWrapper(tunnelStatus.status === 'connected' ? 'emerald' : tunnelStatus.status === 'not_configured' ? 'slate' : 'amber')}>
            <span style={{ fontSize: '20px' }}>🌐</span>
          </div>
          <div style={styles.statsInfo}>
            <span style={styles.statsLabel}>Status VPN Gateway</span>
            <strong style={{
              ...styles.statsValue,
              color: tunnelStatus.status === 'connected' ? 'hsl(var(--primary))' : tunnelStatus.status === 'not_configured' ? 'hsl(var(--muted-foreground))' : '#f59e0b'
            }}>
              {tunnelStatus.status === 'connected' ? 'CONNECTED' : tunnelStatus.status === 'not_configured' ? 'BELUM AKTIF' : 'DISCONNECTED'}
            </strong>
            <span style={styles.statsDesc}>
              {tunnelStatus.status === 'connected' ? (tunnelStatus.subdomain || 'Gateway Aktif') : 'Koneksi jalur aman luar'}
            </span>
          </div>
        </div>

        <div 
          style={{
            ...styles.statsCard,
            transform: hoveredCard === 'trx' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredCard === 'trx' ? '0 10px 20px -5px rgba(0, 0, 0, 0.08)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
          onMouseEnter={() => setHoveredCard('trx')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statsIconWrapper('blue')}>
            <span style={{ fontSize: '20px' }}>🧾</span>
          </div>
          <div style={styles.statsInfo}>
            <span style={styles.statsLabel}>Riwayat Tagihan</span>
            <strong style={styles.statsValue}>{historyInvoices.length} Invoice</strong>
            <span style={styles.statsDesc}>
              {historyInvoices.filter(inv => inv.status === 'paid').length} Lunas | {historyInvoices.filter(inv => inv.status === 'unpaid' || inv.status === 'pending').length} Tertunda
            </span>
          </div>
        </div>
      </div>

      <div style={styles.contentLayout}>
        {/* LEFT PANEL: LICENSE & SYSTEM INFO */}
        <div style={styles.leftPanel}>
          <div className="card" style={styles.card}>
            <h3 style={styles.cardTitle}>Status Lisensi Instansi</h3>
            <p style={styles.cardDesc}>Pantau validitas masa aktif layanan server lokal sekolah Anda</p>
            
            <div style={styles.licenseStatusBox}>
              {expiryDateStr ? (
                <div style={styles.licenseValid}>
                  <div style={styles.statusBadge(daysRemaining > 0)}>
                    {daysRemaining > 0 ? (daysRemaining > 7 ? 'AKTIF' : 'HAMPIR HABIS') : 'KEDALUWARSA'}
                  </div>
                  <div style={styles.licenseDetails}>
                    <p style={styles.detailsText}>Masa Aktif Hingga: <strong>{expiryDateStr}</strong></p>
                    <p style={styles.detailsText}>Sisa Waktu: <strong>{daysRemaining > 0 ? `${daysRemaining} Hari` : 'Sudah Habis'}</strong></p>
                  </div>
                </div>
              ) : (
                <div style={styles.licenseInvalid}>
                  <p>⚠️ Tidak ada lisensi aktif ter-sync di database lokal ini.</p>
                </div>
              )}
            </div>

            <div style={styles.licenseInputGroup}>
              <input
                type="text"
                className="input"
                placeholder="Masukkan Kunci Lisensi (License Key)"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                style={styles.licInput}
              />
              <button className="btn btn-accent" style={styles.saveBtn} onClick={handleSaveLicenseKey}>Simpan</button>
            </div>

            <button 
              className="btn btn-primary" 
              style={styles.syncBtn} 
              onClick={handleSyncLicense}
              disabled={syncing}
            >
              {syncing ? 'Menghubungi License Server...' : '🔄 Sinkronisasikan Lisensi Sekarang'}
            </button>

            {/* RECEIPT BOX FOR ACTIVE LICENSE */}
            {(() => {
              const schoolNameForPlan = tenant?.settings?.school_name || tenant?.name || '';
              const maxMustahiqForPlan = tenant?.settings?.rules?.max_mustahiq;
              const plan = getPlanFromDetails(schoolNameForPlan, maxMustahiqForPlan);
              
              let invoiceToRender = null;
              if (activeInvoice) {
                invoiceToRender = {
                  ...activeInvoice,
                  amount: plan.price,
                  school_name: activeInvoice.school_name || schoolNameForPlan
                };
              } else if (expiryDateStr) {
                invoiceToRender = {
                  license_key: licenseKey,
                  school_name: schoolNameForPlan,
                  amount: plan.price,
                  payment_method: 'QRIS / Virtual Account (Tripay)',
                  invoice_number: 'INV-' + licenseKey.split('-').join('').slice(0, 8).toUpperCase(),
                  expired_time: Math.floor(new Date(expiryDateStr).getTime() / 1000)
                };
              }

              if (!invoiceToRender) return null;

              return (
                <div style={styles.activeInvoiceBox}>
                  <span style={styles.activeInvoiceTitle}>Kuitansi Transaksi Terakhir:</span>
                  <div style={styles.activeInvoiceRow}>
                    <div style={styles.activeInvoiceInfo}>
                      <strong style={styles.activeInvoiceNum}>{invoiceToRender.invoice_number}</strong>
                      <span style={styles.activeInvoicePrice}>{formatPrice(invoiceToRender.amount)}</span>
                    </div>
                    <button 
                      className="btn btn-outline" 
                      style={styles.activeInvoicePrintBtn}
                      onClick={() => handlePrintInvoice(invoiceToRender, true)}
                    >
                      🖨️ Cetak Kuitansi
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* LAYANAN ONLINE GATEWAY (VPN TUNNEL) */}
          <div className="card" style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={styles.cardTitle}>Layanan Online Gateway (VPN Tunnel)</h3>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }} 
                onClick={loadTunnelStatus}
                disabled={loadingTunnel}
              >
                {loadingTunnel ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
            </div>
            <p style={styles.cardDesc}>Online-kan aplikasi server lokal ini agar dapat diakses dari luar jaringan sekolah menggunakan secure VPN Tunnel.</p>
            
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input"
                placeholder="Masukkan Kunci Lisensi VPN (VPN License Key)"
                value={vpnLicenseKey}
                onChange={(e) => setVpnLicenseKey(e.target.value)}
                style={styles.licInput}
              />
              <button className="btn btn-accent" style={styles.saveBtn} onClick={handleSaveVpnLicenseKey}>Simpan</button>
            </div>

            <div style={styles.tunnelStatusBox}>
              {tunnelStatus.status === 'not_configured' ? (
                <div style={styles.licenseValid}>
                  <div style={styles.statusBadgeNotConfigured}>
                    BELUM DIKONFIGURASI
                  </div>
                  <div style={styles.licenseDetails}>
                    <p style={styles.detailsText}>Subdomain yang akan digunakan:</p>
                    <strong style={{ fontSize: '14px', color: 'hsl(var(--foreground))' }}>
                      {tenant?.domain_or_slug ? `${tenant.domain_or_slug}.absenta.id` : 'Memuat subdomain...'}
                    </strong>
                    <p style={{ fontSize: '11.5px', color: 'hsl(var(--muted-foreground))', marginTop: '6px' }}>
                      *Membutuhkan kunci lisensi VPN aktif. Setelah diaktifkan, server lokal akan di-routing otomatis oleh gateway VPS.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={styles.licenseValid}>
                  <div style={tunnelStatus.status === 'connected' ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: tunnelStatus.status === 'connected' ? 'hsl(var(--primary))' : '#ef4444',
                      display: 'inline-block',
                      marginRight: '6px',
                      boxShadow: tunnelStatus.status === 'connected' ? '0 0 8px hsl(var(--primary))' : 'none'
                    }}></span>
                    {tunnelStatus.status === 'connected' ? 'AKTIF / ONLINE' : 'NONAKTIF / OFFLINE'}
                  </div>
                  
                  <div style={styles.infoList}>
                    <div style={styles.infoItem}>
                      <span>Subdomain Publik</span>
                      {tunnelStatus.status === 'connected' ? (
                        <a 
                          href={`http://${tunnelStatus.subdomain}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'hsl(var(--primary))', fontWeight: 'bold', textDecoration: 'underline' }}
                        >
                          {tunnelStatus.subdomain} ↗
                        </a>
                      ) : (
                        <strong style={{ color: 'hsl(var(--muted-foreground))' }}>{tunnelStatus.subdomain} (Offline)</strong>
                      )}
                    </div>
                    <div style={styles.infoItem}>
                      <span>IP WireGuard</span>
                      <strong>{tunnelStatus.client_ip}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {tunnelStatus.status === 'not_configured' ? (
              <button 
                type="button"
                className="btn btn-primary" 
                style={styles.syncBtn} 
                onClick={handleRequestTunnel}
                disabled={requestingTunnel || !vpnLicenseKey}
              >
                {requestingTunnel ? 'Mengaktifkan Gateway...' : '🔑 Daftarkan & Aktifkan Online Gateway'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                {tunnelStatus.status === 'connected' ? (
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    style={{ 
                      ...styles.syncBtn, 
                      borderColor: isPublicConnection ? 'rgba(156, 163, 175, 0.2)' : 'rgba(239, 68, 68, 0.3)', 
                      color: isPublicConnection ? 'hsl(var(--muted-foreground))' : '#ef4444', 
                      cursor: isPublicConnection ? 'not-allowed' : 'pointer',
                      flex: 1 
                    }} 
                    onClick={() => handleToggleTunnel('stop')}
                    disabled={togglingTunnel || isPublicConnection}
                    title={isPublicConnection ? 'Tidak dapat mematikan Online Gateway dari jalur publik' : ''}
                  >
                    {togglingTunnel ? 'Mematikan...' : '🔴 Matikan Online Gateway'}
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ ...styles.syncBtn, flex: 1 }} 
                    onClick={() => handleToggleTunnel('start')}
                    disabled={togglingTunnel}
                  >
                    {togglingTunnel ? 'Menghubungkan...' : '🟢 Aktifkan Online Gateway'}
                  </button>
                )}
              </div>
            )}
            
            {tunnelStatus.status !== 'not_configured' && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ 
                  ...styles.syncBtn, 
                  marginTop: '12px', 
                  borderColor: isPublicConnection ? 'rgba(156, 163, 175, 0.2)' : 'rgba(239, 68, 68, 0.4)', 
                  color: isPublicConnection ? 'hsl(var(--muted-foreground))' : '#ef4444',
                  cursor: isPublicConnection ? 'not-allowed' : 'pointer'
                }}
                onClick={handleResetTunnel}
                disabled={togglingTunnel || requestingTunnel || isPublicConnection}
                title={isPublicConnection ? 'Tidak dapat melepaskan/mereset konfigurasi tunnel dari jalur publik' : ''}
              >
                🗑️ Reset & Hapus Konfigurasi Tunneling
              </button>
            )}

            {tunnelStatus.status !== 'not_configured' && (
              <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '10px', textAlign: 'center' }}>
                {isPublicConnection && tunnelStatus.status === 'connected' ? (
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                    *Tombol matikan dinonaktifkan karena Anda terhubung dari jalur luar (Publik). Silakan akses secara lokal untuk mematikan.
                  </span>
                ) : (
                  '*Menghubungkan tunnel memerlukan hak Administrator pada server lokal.'
                )}
              </p>
            )}
          </div>

          {/* RIWAYAT TRANSAKSI & LISENSI INSTANSI */}
          {licenseKey && (
            <div className="card" style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={styles.cardTitle}>Riwayat Transaksi & Lisensi</h3>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }} 
                  onClick={() => loadHistory(licenseKey)}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? '🔄 Loading...' : '🔄 Refresh'}
                </button>
              </div>
              <p style={styles.cardDesc}>Daftar semua lisensi dan tagihan pembayaran yang terdaftar untuk subdomain Anda.</p>

              {/* Tabs */}
              <div style={styles.tabContainer}>
                <button
                  type="button"
                  style={styles.tabButton(historyTab === 'licenses')}
                  onClick={() => setHistoryTab('licenses')}
                >
                  🔑 Lisensi ({historyLicenses.length})
                </button>
                <button
                  type="button"
                  style={styles.tabButton(historyTab === 'invoices')}
                  onClick={() => setHistoryTab('invoices')}
                >
                  🧾 Invoice ({historyInvoices.length})
                </button>
              </div>

              {historyTab === 'licenses' ? (
                <div>
                  {historyLicenses.length === 0 ? (
                    <p style={styles.noHistoryText}>Tidak ada riwayat lisensi.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {historyLicenses.map((lic) => {
                        const isVpn = lic.product_id === 'vpn-tunnel';
                        const isActive = lic.is_active === 1 && lic.status === 'active';
                        return (
                          <div key={lic.id} style={styles.historyItem}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '13px', color: 'hsl(var(--foreground))' }}>
                                  {lic.product_display_name || lic.product_id}
                                </strong>
                                <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', margin: '2px 0 0 0' }}>
                                  Key: <code style={styles.keyCode}>{lic.license_key}</code>
                                </p>
                              </div>
                              <span style={styles.historyStatusBadge(isActive, lic.status)}>
                                {lic.status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11.5px', color: 'hsl(var(--muted-foreground))' }}>
                              <span>Berlaku hingga: {lic.expires_at}</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ padding: '2px 6px', fontSize: '10px', height: '20px', minWidth: '60px' }}
                                  onClick={async () => {
                                    navigator.clipboard.writeText(lic.license_key);
                                    setCopiedKeyId(lic.id);
                                    setTimeout(() => setCopiedKeyId(null), 2000);
                                  }}
                                >
                                  {copiedKeyId === lic.id ? 'Tersalin! ✅' : 'Salin'}
                                </button>
                                {isVpn && (
                                  <button
                                    type="button"
                                    className="btn btn-accent"
                                    style={{ padding: '2px 6px', fontSize: '10px', height: '20px', color: 'white' }}
                                    onClick={async () => {
                                      setVpnLicenseKey(lic.license_key);
                                      await ApiService.updateTenantProfile(null, { vpn_license_key: lic.license_key });
                                      await showAlert('Lisensi VPN berhasil diterapkan ke konfigurasi Anda!');
                                      await loadData();
                                    }}
                                  >
                                    Gunakan
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {historyInvoices.length === 0 ? (
                    <p style={styles.noHistoryText}>Tidak ada riwayat invoice.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {historyInvoices.map((inv) => {
                        const isPaid = inv.status === 'paid';
                        return (
                          <div key={inv.id} style={styles.historyItem}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <strong style={{ fontSize: '13px', color: 'hsl(var(--foreground))' }}>
                                  {inv.invoice_number}
                                </strong>
                                <p style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', margin: '2px 0 0 0' }}>
                                  {inv.product_display_name || inv.product_id} ({inv.payment_method || 'Manual'})
                                </p>
                              </div>
                              <span style={styles.invoiceStatusBadge(isPaid)}>
                                {inv.status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11.5px' }}>
                              <strong style={{ color: 'hsl(var(--primary))' }}>
                                {formatPrice(inv.amount)}
                              </strong>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '2px 6px', fontSize: '10px', height: '20px' }}
                                onClick={() => handlePrintInvoice(inv, isPaid)}
                              >
                                🖨️ Cetak
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="card" style={styles.card}>
            <h3 style={styles.cardTitle}>Informasi Aplikasi</h3>
            <p style={styles.cardDesc}>Detail server dan database engine aktif</p>
            
            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <span>Tipe Database</span>
                <strong>SQLite (dev.db)</strong>
              </div>
              <div style={styles.infoItem}>
                <span>Status Koneksi</span>
                <strong style={{ color: 'hsl(var(--primary))' }}>ONLINE (Connected)</strong>
              </div>
              <div style={styles.infoItem}>
                <span>Provider Engine</span>
                <strong>Prisma ORM</strong>
              </div>
              <div style={styles.infoItem}>
                <span>Server Port</span>
                <strong>{import.meta.env.VITE_BACKEND_PORT || '5002'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: BILLING & CHECKOUT */}
        <div style={styles.rightPanel}>
          {pendingKey ? (
            /* PENDING PAYMENT BOX (VA/QRIS) */
            <div className="card" style={styles.card}>
              <div style={styles.paymentBoxHeader}>
                <h3 style={styles.cardTitle}>Tagihan Pembayaran Lisensi</h3>
                <span style={styles.badgePending}>MENUNGGU PEMBAYARAN</span>
              </div>
              <p style={styles.payInstructions}>Silakan lakukan pembayaran sesuai nominal dan petunjuk di bawah ini untuk mengaktifkan lisensi sekolah Anda secara otomatis.</p>

              {loadingPayment && !paymentDetails ? (
                <div style={styles.centerText}>Memuat rincian invoice...</div>
              ) : paymentDetails ? (
                <div style={styles.paymentDetailsWrapper}>
                  <div style={styles.amountBox}>
                    <span style={styles.amountLabel}>TOTAL PEMBAYARAN:</span>
                    <strong style={styles.amountValue}>{formatPrice(paymentDetails.amount)}</strong>
                    <span style={styles.amountHelp}>*Bayar dengan nominal presisi agar terverifikasi otomatis.</span>
                  </div>

                  {paymentDetails.expired_time && (
                    <div style={styles.expiryBox}>
                      ⏳ Bayar Sebelum: <strong style={styles.expiryTime}>
                        {new Date(paymentDetails.expired_time * 1000).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </strong>
                    </div>
                  )}

                  {paymentDetails.payment_method?.toUpperCase().includes('QRIS') ? (
                    <div style={styles.qrSection}>
                      <span style={styles.payCodeLabel}>PINDAI KODE QRIS BERIKUT:</span>
                      <div style={styles.qrContainer}>
                        {paymentDetails.qr_url ? (
                          <img src={paymentDetails.qr_url} alt="QRIS Code" style={styles.qrisImage} />
                        ) : (
                          <p>Memuat QRIS...</p>
                        )}
                      </div>
                      <div style={styles.qrActions}>
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          style={styles.qrActionBtn} 
                          onClick={handlePrintQris}
                        >
                          🖨️ Cetak QRIS
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          style={styles.qrActionBtn} 
                          onClick={handleDownloadQris}
                        >
                          📥 Unduh QRIS
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.payCodeContainer}>
                      <span style={styles.payCodeLabel}>NOMOR VIRTUAL ACCOUNT / KODE BAYAR:</span>
                      <div style={styles.payCodeRow}>
                        <strong style={styles.payCodeText}>{paymentDetails.pay_code || 'Gagal generate kode'}</strong>
                        <button 
                          className="btn btn-outline" 
                          style={{ ...styles.btnCopy, minWidth: '90px' }} 
                          onClick={async () => {
                            if (paymentDetails.pay_code) {
                              navigator.clipboard.writeText(paymentDetails.pay_code);
                              setCopiedVa(true);
                              setTimeout(() => setCopiedVa(false), 2000);
                            }
                          }}
                        >
                          {copiedVa ? 'Tersalin! ✅' : 'Salin'}
                        </button>
                      </div>
                    </div>
                  )}

                  {((paymentDetails.payment_instructions && paymentDetails.payment_instructions.length > 0) || 
                    (paymentDetails.instructions && paymentDetails.instructions.length > 0)) && (
                    <div style={styles.instructionsContainer}>
                      <h4 style={styles.instructionsHeader}>📖 Petunjuk Pembayaran:</h4>
                      {(paymentDetails.payment_instructions || paymentDetails.instructions).map((inst, index) => (
                        <div key={index} style={styles.instructionGroup}>
                          <strong style={styles.instructionTitle}>{inst.title}</strong>
                          <ol style={styles.instructionSteps}>
                            {inst.steps.map((step, sIdx) => (
                              <li key={sIdx} style={styles.instructionStep} dangerouslySetInnerHTML={{ __html: step }}></li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.statusBox}>
                    <button 
                      className="btn btn-primary" 
                      style={styles.checkStatusBtn}
                      onClick={() => fetchPaymentDetails(pendingKey)}
                    >
                      🔄 Perbarui Status Pembayaran
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={styles.printInvoiceBtn}
                      onClick={() => handlePrintInvoice(paymentDetails, false)}
                    >
                      🖨️ Cetak Invoice Tagihan
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={styles.cancelPayBtn}
                      onClick={handleCancelPayment}
                    >
                      Batalkan Pengajuan
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.centerText}>Rincian pembayaran gagal dimuat.</div>
              )}
            </div>
          ) : (
            /* ORDER FORM */
            <div className="card" style={styles.card}>
              <h3 style={styles.cardTitle}>Pembelian & Perpanjang Lisensi</h3>
              
              {/* Product Type Toggle (Segmented Control) */}
              <div style={styles.segmentedControl}>
                <button
                  type="button"
                  onClick={() => setSelectedProduct('app')}
                  style={styles.segmentButton(selectedProduct === 'app')}
                >
                  🌙 Aplikasi Mustahiq Care
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct('vpn')}
                  style={styles.segmentButton(selectedProduct === 'vpn')}
                >
                  🌐 Online Gateway (VPN)
                </button>
              </div>

              <p style={styles.cardDesc}>
                {selectedProduct === 'vpn' 
                  ? 'Pilih paket VPN Tunneling agar server lokal Anda dapat diakses online via subdomain absenta.id' 
                  : 'Pilih paket lisensi Lifetime (Beli Sekali) sesuai kebutuhan instansi Anda'}
              </p>
              
              <form onSubmit={handleRequestLicense} style={styles.billingForm}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nama Instansi / Madrasah *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Masukkan nama sekolah atau yayasan"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Pilih Paket Lisensi *</label>
                  <div style={styles.packagesList}>
                    {packages.map(pkg => {
                      const isSelected = selectedPackage === pkg.id;
                      const isPopular = pkg.id?.includes('pro') || pkg.id?.includes('semester');
                      return (
                        <label 
                          key={pkg.id} 
                          style={{
                            ...styles.packageOption(isSelected, pkg.id),
                            transform: hoveredCard === pkg.id ? 'translateY(-2px)' : 'none',
                            boxShadow: isSelected 
                              ? '0 10px 15px -3px rgba(16, 185, 129, 0.12)' 
                              : (hoveredCard === pkg.id ? '0 8px 12px -3px rgba(0, 0, 0, 0.05)' : 'none')
                          }}
                          onClick={() => setSelectedPackage(pkg.id)}
                          onMouseEnter={() => setHoveredCard(pkg.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                          <input
                            type="radio"
                            name="package"
                            value={pkg.id}
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ display: 'none' }}
                          />
                          {isPopular && (
                            <span style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              color: '#f59e0b',
                              fontSize: '8px',
                              fontWeight: '900',
                              padding: '2px 6px',
                              borderRadius: '20px',
                              letterSpacing: '0.5px',
                            }}>
                              REKOMENDASI
                            </span>
                          )}
                          <div style={styles.pkgTitle}>{pkg.title}</div>
                          <div style={styles.pkgPrice}>{formatPrice(pkg.price)}</div>
                          <div style={styles.pkgFeatures}>
                            <div style={styles.pkgFeatureItem}>
                              👥 {getLimitInfo(pkg).mustahiq}
                            </div>
                            <div style={styles.pkgFeatureItem}>
                              💾 {getLimitInfo(pkg).storage}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {selectedProduct === 'app' && (
                  <div style={styles.addonContainer}>
                    <label style={styles.addonLabel}>
                      <input
                        type="checkbox"
                        checked={includeVpnAddon}
                        onChange={(e) => setIncludeVpnAddon(e.target.checked)}
                        style={styles.addonCheckbox}
                      />
                      <div style={styles.addonTextWrapper}>
                        <span style={styles.addonTitle}>🔌 Tambahkan Online Gateway (VPN Tunnel Addon)</span>
                        <span style={styles.addonDesc}>Meng-online-kan aplikasi server lokal agar dapat diakses dari luar sekolah via subdomain <strong>{tenant?.domain_or_slug ? `${tenant.domain_or_slug}.absenta.id` : 'absenta.id'}</strong> (+Rp 50.000 / Bulan)</span>
                      </div>
                    </label>
                  </div>
                )}

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Metode Pembayaran (Tripay) *</label>
                  <div style={styles.channelsGrid}>
                    {paymentChannels.map(ch => (
                      <div 
                        key={ch.code}
                        style={styles.channelOption(selectedChannel === ch.code)}
                        onClick={() => setSelectedChannel(ch.code)}
                      >
                        <img src={ch.icon_url} alt={ch.name} style={styles.channelIcon} />
                        <span style={styles.channelName}>{ch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={styles.orderSubmitBtn} 
                  disabled={requesting}
                >
                  {requesting ? 'Memproses Pesanan...' : '💳 Lanjutkan Pembayaran'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
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
    marginBottom: '8px',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '8px',
  },
  statsCard: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
  },
  statsIconWrapper: (variant) => {
    let bg = 'rgba(107, 114, 128, 0.1)';
    let color = 'hsl(var(--muted-foreground))';
    if (variant === 'emerald') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = 'hsl(var(--primary))';
    } else if (variant === 'amber') {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#f59e0b';
    } else if (variant === 'blue') {
      bg = 'rgba(59, 130, 246, 0.12)';
      color = '#3b82f6';
    }
    return {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      backgroundColor: bg,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  },
  statsInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statsLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'hsl(var(--muted-foreground))',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statsValue: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'hsl(var(--foreground))',
    lineHeight: '1.2',
  },
  statsDesc: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    padding: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  cardDesc: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    marginBottom: '16px',
  },
  licenseStatusBox: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  licenseValid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusBadge: (isActive) => ({
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
    border: '1px solid ' + (isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
    color: isActive ? 'hsl(var(--primary))' : '#ef4444',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  }),
  licenseDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailsText: {
    fontSize: '13px',
    color: 'hsl(var(--foreground))',
  },
  licenseInvalid: {
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '500',
  },
  licenseInputGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  licInput: {
    flex: 1,
  },
  saveBtn: {
    minWidth: '80px',
  },
  syncBtn: {
    width: '100%',
    padding: '12px',
  },
  activeInvoiceBox: {
    marginTop: '16px',
    borderTop: '1px dashed hsl(var(--border))',
    paddingTop: '16px',
  },
  activeInvoiceTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'hsl(var(--muted-foreground))',
    display: 'block',
    marginBottom: '8px',
  },
  activeInvoiceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid hsl(var(--border))',
  },
  activeInvoiceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  activeInvoiceNum: {
    fontWeight: '700',
    color: 'hsl(var(--foreground))',
  },
  activeInvoicePrice: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
  },
  activeInvoicePrintBtn: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    borderBottom: '1px dashed hsl(var(--border))',
    paddingBottom: '8px',
  },
  paymentBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: 'hsl(var(--accent))',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  payInstructions: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  paymentDetailsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  amountBox: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  amountLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'hsl(var(--muted-foreground))',
  },
  amountValue: {
    fontSize: '22px',
    fontWeight: '900',
    color: 'hsl(var(--accent))',
  },
  amountHelp: {
    fontSize: '10px',
    color: 'hsl(var(--muted-foreground))',
    textAlign: 'center',
  },
  qrSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  qrContainer: {
    width: '200px',
    height: '200px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  },
  qrisImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  qrActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px',
    width: '100%',
    maxWidth: '240px',
  },
  qrActionBtn: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  payCodeContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  payCodeLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'hsl(var(--muted-foreground))',
    textAlign: 'center',
  },
  payCodeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  payCodeText: {
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  btnCopy: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  statusBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  checkStatusBtn: {
    width: '100%',
    padding: '12px',
  },
  cancelPayBtn: {
    width: '100%',
    padding: '12px',
    color: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  billingForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'hsl(var(--muted-foreground))',
  },
  packagesList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  segmentedControl: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '20px',
    border: '1px solid hsl(var(--border))',
  },
  segmentButton: (isActive) => ({
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '700',
    backgroundColor: isActive ? 'hsl(var(--card))' : 'transparent',
    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
    border: 'none',
    boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  }),
  packageOption: (isSelected, pkgId = '') => ({
    position: 'relative',
    border: isSelected ? '2px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
    borderRadius: '14px',
    padding: '16px 18px',
    cursor: 'pointer',
    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.03)' : 'hsl(var(--card))',
    transition: 'all 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    gridColumn: (pkgId.includes('enterprise') || pkgId.includes('annual')) ? 'span 2' : 'span 1',
    overflow: 'hidden',
  }),
  pkgTitle: {
    fontWeight: '800',
    fontSize: '13.5px',
    color: 'hsl(var(--foreground))',
  },
  pkgPrice: {
    fontSize: '15px',
    fontWeight: '900',
    color: 'hsl(var(--primary))',
  },
  pkgFeatures: {
    marginTop: '8px',
    borderTop: '1px solid hsl(var(--border))',
    paddingTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pkgFeatureItem: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  channelsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    maxHeight: '160px',
    overflowY: 'auto',
    padding: '6px',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  channelOption: (isSelected) => ({
    border: '1px solid ' + (isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'hsl(var(--card))',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
  }),
  channelIcon: {
    width: '45px',
    height: '25px',
    objectFit: 'contain',
    backgroundColor: '#fff',
    padding: '2px',
    borderRadius: '4px',
    border: '1px solid #eee',
  },
  channelName: {
    fontSize: '11px',
    fontWeight: '600',
  },
  orderSubmitBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '10px',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '14px',
    color: 'hsl(var(--muted-foreground))',
  },
  expiryBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '12px',
    color: '#ef4444',
  },
  expiryTime: {
    fontWeight: '700',
  },
  instructionsContainer: {
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '14px',
    backgroundColor: 'hsl(var(--background))',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  instructionsHeader: {
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  instructionGroup: {
    marginBottom: '12px',
  },
  instructionTitle: {
    fontSize: '11.5px',
    fontWeight: '600',
    color: 'hsl(var(--foreground))',
    display: 'block',
    marginBottom: '6px',
  },
  instructionSteps: {
    paddingLeft: '18px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  instructionStep: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.4',
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialogBox: {
    width: '90%',
    maxWidth: '360px',
    padding: '24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  dialogIcon: {
    fontSize: '40px',
  },
  dialogMessage: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'hsl(var(--foreground))',
    lineHeight: '1.5',
  },
  dialogButtons: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    justifyContent: 'center',
    marginTop: '6px',
  },
  dialogConfirmBtn: {
    padding: '8px 24px',
    fontSize: '13px',
    minWidth: '90px',
  },
  dialogCancelBtn: {
    padding: '8px 24px',
    fontSize: '13px',
    minWidth: '90px',
  },
  printInvoiceBtn: {
    width: '100%',
    padding: '12px',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  tunnelStatusBox: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusBadgeActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'hsl(var(--primary))',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)',
  },
  statusBadgeInactive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  statusBadgeNotConfigured: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    border: '1px solid rgba(107, 114, 128, 0.3)',
    color: 'hsl(var(--muted-foreground))',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid hsl(var(--border))'
  },
  tabButton: (isActive) => ({
    flex: 1,
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: isActive ? 'hsl(var(--background))' : 'transparent',
    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
    border: isActive ? '1px solid hsl(var(--border))' : 'none',
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }),
  noHistoryText: {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground))',
    textAlign: 'center',
    padding: '16px 0'
  },
  historyItem: {
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    padding: '14px',
    backgroundColor: 'hsl(var(--card))',
    marginBottom: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    transition: 'all 0.2s ease',
  },
  keyCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: '2px 4px',
    borderRadius: '4px',
    fontSize: '11px'
  },
  historyStatusBadge: (isActive, status) => {
    const isPending = status === 'pending';
    return {
      fontSize: '10px',
      fontWeight: 'bold',
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : (isPending ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
      color: isActive ? '#10b981' : (isPending ? '#f59e0b' : '#ef4444'),
      border: '1px solid ' + (isActive ? 'rgba(16, 185, 129, 0.3)' : (isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'))
    };
  },
  invoiceStatusBadge: (isPaid) => ({
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
    color: isPaid ? '#10b981' : '#f59e0b',
    border: '1px solid ' + (isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)')
  }),
  addonContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    border: '1px dashed rgba(16, 185, 129, 0.3)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '20px',
    textAlign: 'left'
  },
  addonLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  addonCheckbox: {
    marginTop: '3px',
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  addonTextWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  addonTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: 'hsl(var(--foreground))'
  },
  addonDesc: {
    fontSize: '11px',
    color: 'hsl(var(--muted-foreground))',
    lineHeight: '1.4'
  },
};
