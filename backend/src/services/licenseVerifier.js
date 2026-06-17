const prisma = require('../prisma');

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
const PRODUCT_ID = 'project-yatim';

class LicenseVerifier {
  /**
   * Decodes a JWT token payload locally without verification (pure JS)
   */
  static decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    } catch (e) {
      return null;
    }
  }

  /**
   * Directly contacts the license server to verify/activate the tenant's license key,
   * updates the local tenant settings with the retrieved token and quota limits.
   */
  static async syncLicense(tenantId) {
    console.log(`[LicenseVerifier] Syncing license for Tenant ID: ${tenantId}...`);
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new Error('Tenant not found');

      const licenseKey = tenant.license_key;
      if (!licenseKey) {
        console.log(`[LicenseVerifier] Tenant ${tenantId} has no license key.`);
        return { success: false, message: 'No license key linked.' };
      }

      // Generate a stable device ID for the backend instance, combined with hardware signature to prevent folder duplication/cloning piracy
      const os = require('os');
      const crypto = require('crypto');
      const interfaces = os.networkInterfaces();
      let macs = '';
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
            macs += net.mac;
          }
        }
      }
      const machineFingerprint = crypto
        .createHash('sha1')
        .update(`${os.hostname()}-${os.platform()}-${os.arch()}-${macs}`)
        .digest('hex')
        .slice(0, 12);

      const deviceId = `backend-server-${tenantId}-${machineFingerprint}`;

      // Contact license server to activate/verify
      const response = await fetch(`${LICENSE_SERVER_URL}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
          product_id: PRODUCT_ID
        })
      });

      const result = await response.json();

      if (result.success && result.token) {
        // Decode token to read expiration and rules
        const decoded = this.decodeToken(result.token);
        if (decoded) {
          // Parse existing settings
          let settings = {};
          try {
            settings = JSON.parse(tenant.settings || '{}');
          } catch (e) {
            settings = {};
          }

          // Update settings with the fresh license token and limits
          settings.rules = settings.rules || {};
          const nameLower = (decoded.school_name || '').toLowerCase();
          if (nameLower.includes('basic')) {
            settings.rules.max_mustahiq = 100;
          } else if (nameLower.includes('pro')) {
            settings.rules.max_mustahiq = 500;
          } else {
            settings.rules.max_mustahiq = 99999;
          }
          settings.license_token = result.token;
          settings.license_expires_at = decoded.expires_at;
          settings.school_name = decoded.school_name || tenant.name;

          // If core license includes VPN addon, automatically copy it to vpn_license_key
          if (decoded.include_vpn || decoded.vpn_enabled || result.include_vpn) {
            settings.vpn_license_key = licenseKey.trim();
          }

          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              settings: JSON.stringify(settings),
              is_active: true
            }
          });

          console.log(`✓ License sync successful for Tenant: ${decoded.school_name}. Expires: ${decoded.expires_at}`);
          return { success: true, expires_at: decoded.expires_at };
        }
      }

      console.warn(`[LicenseVerifier] Online validation failed for key: ${licenseKey}. Msg: ${result.message}`);
      return { success: false, message: result.message || 'Validation failed.' };

    } catch (error) {
      console.error('[LicenseVerifier Error] Online sync failed. Falling back to cached license:', error.message);
      
      // Offline fallback: Check if we have a cached token in database settings
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant) {
          const settings = JSON.parse(tenant.settings || '{}');
          if (settings.license_token) {
            const decoded = this.decodeToken(settings.license_token);
            const todayStr = new Date().toISOString().slice(0, 10);
            if (decoded && decoded.expires_at >= todayStr) {
              console.log(`✓ Cached offline license is still valid. Expires: ${decoded.expires_at}`);
              return { success: true, expires_at: decoded.expires_at, offline: true };
            }
          }
        }
      } catch (dbErr) {
        console.error('[LicenseVerifier Error] SQLite read failed:', dbErr.message);
      }

      return { success: false, error: error.message };
    }
  }
}

module.exports = LicenseVerifier;
