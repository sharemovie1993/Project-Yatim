const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'mustahiq_secret_key_2026';

function hashPassword(password) {
  const salt = 'mustahiq_care_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, tenant_name, domain_or_slug } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required.' });
    }

    // 1. Find or create Tenant
    let tenantId;
    if (domain_or_slug) {
      let tenant = await prisma.tenant.findUnique({ where: { domain_or_slug } });
      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: {
            name: tenant_name || 'Sekolah Baru',
            domain_or_slug: domain_or_slug.toLowerCase().trim(),
            settings: JSON.stringify({
              rules: { max_mustahiq: 100, max_age_yatim: 15 }
            })
          }
        });
      }
      tenantId = tenant.id;
    } else {
      // Create fallback tenant if none provided
      const fallbackSlug = 'school-' + Date.now().toString().slice(-4);
      const tenant = await prisma.tenant.create({
        data: {
          name: tenant_name || 'Sekolah Baru',
          domain_or_slug: fallbackSlug,
          settings: JSON.stringify({
            rules: { max_mustahiq: 100, max_age_yatim: 15 }
          })
        }
      });
      tenantId = tenant.id;
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    // 3. Hash password and save
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        tenant_id: tenantId,
        role: 'ADMIN' // First registered user is Admin
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      }
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
