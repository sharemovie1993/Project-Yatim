const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../prisma');

function hashPassword(password) {
  const salt = 'mustahiq_care_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// GET /api/v1/users - Retrieve all users for the current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const users = await prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenant_id: true
      }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('[Get Users Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/users - Create new user inside current tenant
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, error: 'Semua field wajib diisi.' });
    }

    const roleUpper = role.toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'PETUGAS') {
      return res.status(400).json({ success: false, error: 'Role tidak valid. Harus ADMIN atau PETUGAS.' });
    }

    const emailClean = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: emailClean } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email sudah terdaftar.' });
    }

    const newUser = await prisma.user.create({
      data: {
        email: emailClean,
        password: hashPassword(password),
        name: name.trim(),
        role: roleUpper,
        tenant_id: tenantId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pengguna berhasil dibuat.',
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('[Create User Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/v1/users/:id - Update user details or password
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { id } = req.params;
    const { name, role, password } = req.body;

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate || userToUpdate.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (password) updateData.password = hashPassword(password);
    
    if (role) {
      const roleUpper = role.toUpperCase();
      if (roleUpper !== 'ADMIN' && roleUpper !== 'PETUGAS') {
        return res.status(400).json({ success: false, error: 'Role tidak valid.' });
      }

      // Safeguard: check if changing from ADMIN to PETUGAS leaves 0 admins
      if (userToUpdate.role === 'ADMIN' && roleUpper === 'PETUGAS') {
        const adminCount = await prisma.user.count({
          where: { tenant_id: tenantId, role: 'ADMIN' }
        });
        if (adminCount <= 1) {
          return res.status(400).json({ success: false, error: 'Tidak dapat mengubah peran admin terakhir. Harus tersisa minimal 1 Admin.' });
        }
      }
      updateData.role = roleUpper;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Detail pengguna berhasil diperbarui.',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('[Update User Error]', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { id } = req.params;

    // Safeguard: Cannot delete self
    if (req.user && req.user.id === id) {
      return res.status(400).json({ success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete || userToDelete.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }

    // Safeguard: Cannot delete the last admin
    if (userToDelete.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { tenant_id: tenantId, role: 'ADMIN' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, error: 'Tidak dapat menghapus admin terakhir. Harus tersisa minimal 1 Admin.' });
      }
    }

    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
  } catch (error) {
    console.error('[Delete User Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
