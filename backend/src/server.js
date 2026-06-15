const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route Imports
const mustahiqRouter = require('./routes/mustahiq');
const kategoriRouter = require('./routes/kategori');
const kelompokRouter = require('./routes/kelompok');
const programRouter = require('./routes/program');
const licenseRouter = require('./routes/license');
const tenantRouter = require('./routes/tenant');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const systemRouter = require('./routes/system');
const verifyToken = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 5002;

// Middlewares
app.use(cors());
app.use(express.json());

// Base Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mustahiq Care API Server is running smoothly.',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mustahiq', mustahiqRouter);
app.use('/api/v1/kategori', kategoriRouter);
app.use('/api/v1/kelompok', kelompokRouter);
app.use('/api/v1/program', programRouter);
app.use('/api/v1/license', licenseRouter);
app.use('/api/v1/tenant', tenantRouter);
app.use('/api/v1/users', verifyToken, usersRouter);
app.use('/api/v1/system', systemRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Mustahiq Care API running on port ${PORT}`);
});

