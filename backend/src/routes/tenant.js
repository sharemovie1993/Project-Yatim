const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // limit 2MB
});

const getTenantId = (req) => {
  return req.headers['x-tenant-id'] || req.query.tenant_id;
};

// GET /api/v1/tenant/profile
router.get('/profile', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      // Auto-create default tenant if it doesn't exist for convenience
      tenant = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'Madrasah Uji Coba',
          domain_or_slug: 'demo',
          settings: JSON.stringify({
            theme: { primary_color: "#059669", accent_color: "#D97706" },
            branding: { slogan: "Berbagi Kehangatan Bersama Yatim Dhuafa" },
            rules: { max_mustahiq: 100, max_age_yatim: 15 }
          })
        }
      });
    }

    let settings = {};
    try {
      settings = JSON.parse(tenant.settings || '{}');
    } catch (e) {
      settings = {};
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        domain_or_slug: tenant.domain_or_slug,
        custom_domain: tenant.custom_domain,
        license_key: tenant.license_key,
        is_active: tenant.is_active,
        settings,
        created_at: tenant.created_at
      }
    });
  } catch (error) {
    console.error('[GET Tenant Profile Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/tenant/profile
router.put('/profile', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { name, settings: newSettings } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found.' });
    }

    let currentSettings = {};
    try {
      currentSettings = JSON.parse(tenant.settings || '{}');
    } catch (e) {
      currentSettings = {};
    }

    // Merge settings
    const mergedSettings = { ...currentSettings, ...newSettings };

    // Extract license key if present in settings payload
    const licenseKey = newSettings?.license_key;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: name || undefined,
        license_key: licenseKey || undefined,
        settings: JSON.stringify(mergedSettings)
      }
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        settings: mergedSettings
      }
    });
  } catch (error) {
    console.error('[PUT Tenant Profile Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/tenant/profile/upload
router.post('/profile/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }
    const fileUrl = `/api/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tenant/resolve
// Public endpoint: resolves tenant details based on active hostname
router.get('/resolve', async (req, res) => {
  try {
    const { hostname } = req.query;
    if (!hostname) {
      return res.status(400).json({ success: false, error: 'Hostname query parameter is required.' });
    }

    const hostClean = hostname.trim().toLowerCase();

    // Query by custom domain first, fallback to domain_or_slug
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { custom_domain: hostClean },
          { domain_or_slug: hostClean }
        ]
      }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found for the specified domain.' });
    }

    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(tenant.settings || '{}');
    } catch (e) {
      parsedSettings = {};
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        domain_or_slug: tenant.domain_or_slug,
        custom_domain: tenant.custom_domain,
        settings: parsedSettings
      }
    });
  } catch (error) {
    console.error('[GET Tenant Resolve Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/tenant/validate-domain
// Public endpoint: Caddy dynamically queries this to verify if it should generate SSL for a custom domain.
// Returns HTTP 200 if yes, HTTP 404/400 if no.
router.get('/validate-domain', async (req, res) => {
  try {
    const domain = req.query.domain;
    if (!domain) {
      return res.status(400).send('Domain parameter is required');
    }

    const domainClean = domain.trim().toLowerCase();

    const tenant = await prisma.tenant.findUnique({
      where: { custom_domain: domainClean }
    });

    if (tenant && tenant.is_active) {
      return res.status(200).send('OK');
    } else {
      return res.status(404).send('Domain not allowed or inactive');
    }
  } catch (error) {
    console.error('[GET Tenant Validate Domain Error]', error);
    res.status(500).send('Internal Server Error');
  }
});

// PUT /api/v1/tenant/profile/custom-domain
// Authenticated endpoint: allows a tenant administrator to set or remove their custom domain
router.put('/profile/custom-domain', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID is required.' });
    }

    const { custom_domain } = req.body;
    let targetDomain = null;

    if (custom_domain) {
      targetDomain = custom_domain.trim().toLowerCase();
      
      // Enforce valid domain format regex (e.g. zakat.lembaga-a.org)
      const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!domainRegex.test(targetDomain)) {
        return res.status(400).json({
          success: false,
          error: 'Format domain kustom tidak valid. Contoh format: zakat.lembaga-anda.org'
        });
      }

      // Ensure domain is not already registered by another tenant
      const duplicateTenant = await prisma.tenant.findFirst({
        where: {
          custom_domain: targetDomain,
          NOT: { id: tenantId }
        }
      });

      if (duplicateTenant) {
        return res.status(400).json({
          success: false,
          error: 'Domain kustom ini sudah digunakan oleh lembaga lain.'
        });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { custom_domain: targetDomain }
    });

    res.json({
      success: true,
      message: targetDomain 
        ? `Domain kustom berhasil dihubungkan ke: ${targetDomain}` 
        : 'Domain kustom berhasil dilepas.',
      custom_domain: updated.custom_domain
    });
  } catch (error) {
    console.error('[PUT Tenant Custom Domain Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
