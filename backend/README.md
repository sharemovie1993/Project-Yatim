# Mustahiq Care API Backend Server

Backend API Server terpusat untuk aplikasi **Mustahiq Care** (Project Yatim). Backend ini bertugas mengolah seluruh logika bisnis, validasi lisensi, integrasi database Supabase (PostgreSQL), dan integrasi import/export data Excel.

## 📂 Struktur Project

*   `/src/config` - Konfigurasi database & environment.
*   `/src/controllers` - Handler fungsi request API.
*   `/src/middlewares` - Middleware otentikasi & pengamanan.
*   `/src/routes` - Definisi routing API endpoints.
*   `server.js` - Server starter.

## 🚀 Cara Menjalankan Lokal (Development)

1. Buat file `.env` di root folder backend ini dan isikan variabel berikut:
   ```env
   PORT=5002
   DATABASE_URL=postgres://[user]:[password]@[host]:[port]/[database]
   JWT_SECRET=rahasia_mustahiq_care_2026
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm run dev
   ```
