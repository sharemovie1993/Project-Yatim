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

module.exports = router;
