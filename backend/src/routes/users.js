const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../prisma');

function hashPassword(password) {
  const salt = 'mustahiq_care_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function isStrongPassword(password) {
  // Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

// GET /api/v1/users - Retrieve all users for the current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { page, limit, paginate, search } = req.query;
    const where = { tenant_id: tenantId };

    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { name: { contains: searchStr } },
        { email: { contains: searchStr } }
      ];
    }

    const [totalUsers, adminCount, staffCount] = await Promise.all([
      prisma.user.count({ where: { tenant_id: tenantId } }),
      prisma.user.count({ where: { tenant_id: tenantId, role: 'ADMIN' } }),
      prisma.user.count({ where: { tenant_id: tenantId, role: 'PETUGAS' } })
    ]);

    const stats = {
      total: totalUsers,
      admin: adminCount,
      staff: staffCount
    };

    const isPaginated = paginate === 'true' || page !== undefined;

    if (isPaginated) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skipNum = (pageNum - 1) * limitNum;

      const totalItems = await prisma.user.count({ where });
      const data = await prisma.user.findMany({
        where,
        skip: skipNum,
        take: limitNum,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenant_id: true
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data,
        stats,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
          limit: limitNum
        }
      });
    } else {
      const data = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenant_id: true
        },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, data, stats });
    }
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

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Kata sandi kurang kuat. Harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, serta karakter khusus (seperti @$!%*?&).'
      });
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
    
    if (password) {
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          error: 'Kata sandi kurang kuat. Harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, serta karakter khusus (seperti @$!%*?&).'
        });
      }
      updateData.password = hashPassword(password);
    }
    
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
