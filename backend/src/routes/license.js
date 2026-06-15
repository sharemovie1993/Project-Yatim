const express = require('express');
const router = express.Router();
const LicenseVerifier = require('../services/licenseVerifier');

const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// POST /api/v1/license/sync
router.post('/sync', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const syncResult = await LicenseVerifier.syncLicense(tenantId);
    if (syncResult.success) {
      res.json({
        success: true,
        message: syncResult.offline ? 'License verified from local cache (offline mode)' : 'License successfully synchronized with server',
        expires_at: syncResult.expires_at
      });
    } else {
      res.status(400).json({
        success: false,
        error: syncResult.message || 'License verification failed'
      });
    }
  } catch (error) {
    console.error('[License Sync Route Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const WireguardManager = require('../services/wireguardManager');
const prisma = require('../prisma');
const fetch = require('node-fetch');
const verifyToken = require('../middlewares/auth');

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Administrator yang dapat mengakses menu ini.' });
  }
};

// GET /api/v1/license/tunnel/status
router.get('/tunnel/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found.' });
    }

    const settings = JSON.parse(tenant.settings || '{}');
    const wgStatus = WireguardManager.getStatus();

    res.json({
      success: true,
      data: {
        is_configured: WireguardManager.hasConfig(),
        status: wgStatus.status, // connected | disconnected | installed | not_configured
        client_ip: wgStatus.ip || '',
        subdomain: settings.tunnel_subdomain || '',
        tunnel_active: wgStatus.status === 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/license/tunnel/request
router.post('/tunnel/request', verifyToken, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found.' });
    }

    const settings = JSON.parse(tenant.settings || '{}');
    const vpnLicenseKey = settings.vpn_license_key;
    if (!vpnLicenseKey) {
      return res.status(400).json({ success: false, error: 'Kunci lisensi VPN belum dikonfigurasi. Silakan simpan lisensi VPN terlebih dahulu.' });
    }

    const { subdomain_slug } = req.body;
    if (!subdomain_slug) {
      return res.status(400).json({ success: false, error: 'Subdomain slug wajib diisi.' });
    }

    // Call license server to request the tunnel config
    const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const localPort = process.env.PORT || 5002;
    const frontendPort = process.env.FRONTEND_PORT || 5174;
    const response = await fetch(`${LICENSE_SERVER_URL}/api/license/tunnel/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: vpnLicenseKey.trim(),
        subdomain_slug,
        local_port: parseInt(localPort),
        frontend_port: parseInt(frontendPort)
      })
    });

    const result = await response.json();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message || 'Gagal memproses request dari server lisensi.' });
    }

    const { config, subdomain } = result.data;

    // Save the WireGuard config file locally
    const fs = require('fs');
    fs.writeFileSync(WireguardManager.getConfPath(), config, 'utf8');

    // Update settings in local tenant database
    let settings = JSON.parse(tenant.settings || '{}');
    settings.tunnel_subdomain = subdomain;
    
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: JSON.stringify(settings)
      }
    });

    res.json({
      success: true,
      message: 'Tunnel Wireguard berhasil dikonfigurasi.',
      data: {
        subdomain,
        client_ip: result.data.client_ip
      }
    });
  } catch (error) {
    console.error('[Tunnel Request Route Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/license/tunnel/toggle
router.post('/tunnel/toggle', verifyToken, requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { action } = req.body; // 'start' | 'stop'
    if (!action || (action !== 'start' && action !== 'stop')) {
      return res.status(400).json({ success: false, error: "Aksi tidak valid (hanya 'start' atau 'stop')." });
    }

    if (action === 'start') {
      const result = await WireguardManager.startTunnel();
      res.json(result);
    } else {
      const result = await WireguardManager.stopTunnel();
      res.json(result);
    }
  } catch (error) {
    console.error('[Tunnel Toggle Route Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
