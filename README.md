# Project Yatim

Project Yatim adalah aplikasi web manajemen santunan yatim dan dhuafa dengan arsitektur monorepo:

- `backend`: REST API berbasis Express + Prisma
- `frontend`: panel web berbasis React + Vite

Fokus utama aplikasi ini adalah pengelolaan data mustahiq, kelompok distribusi, program santunan, penyaluran bantuan, profil lembaga, lisensi, dan akses domain kustom.

## Fitur Utama

- Autentikasi pengguna berbasis JWT
- Multi-tenant per lembaga/sekolah/yayasan
- CRUD data mustahiq
- CRUD kategori dan kelompok distribusi
- Manajemen program santunan
- Generate daftar penyaluran dari kelompok
- Update status penyaluran bantuan
- Import dan export Excel data mustahiq
- Generate PDF SPJ, daftar anggota kelompok, dan daftar hadir
- Sinkronisasi lisensi ke server lisensi
- Dukungan WireGuard tunnel untuk online gateway
- Pengaturan profil lembaga, logo, stempel, dan custom domain
- Update aplikasi dari server melalui endpoint sistem

## Struktur Proyek

```text
Project-Yatim/
|- backend/
|  |- prisma/
|  |- src/
|  |  |- middlewares/
|  |  |- routes/
|  |  |- services/
|  |  |- prisma.js
|  |  |- server.js
|  |- uploads/
|  |- package.json
|- frontend/
|  |- public/
|  |- src/
|  |  |- components/
|  |  |- services/
|  |  |- App.jsx
|  |  |- main.jsx
|  |- package.json
|- ecosystem.config.js
|- deploy.ps1
|- deploy.sh
|- package.json
```

## Stack Teknologi

### Backend

- Node.js
- Express
- Prisma ORM
- SQLite
- JSON Web Token
- Multer
- ExcelJS
- PDFKit

### Frontend

- React
- Vite
- Fetch API native browser

## Model Data Inti

Database Prisma saat ini menggunakan provider `sqlite` dengan model utama:

- `Tenant`
- `User`
- `Mustahiq`
- `Kategori`
- `Kelompok`
- `AnggotaKelompok`
- `ProgramSantunan`
- `PenyaluranSantunan`

Skema ada di `backend/prisma/schema.prisma`.

## Port Default

- Backend API: `5002`
- Frontend Vite Dev: `5174`

## Konfigurasi Environment

### 1. Root `.env`

Opsional, dipakai untuk konfigurasi umum saat deploy:

```env
EXPO_PUBLIC_LICENSE_SERVER_URL=https://api.absenta.id
```

Catatan: nama variabel masih mengikuti penamaan lama, tetapi proyek aktif saat ini bukan Expo.

### 2. `backend/.env`

Minimal untuk development:

```env
PORT=5002
DATABASE_URL="file:./dev.db"
FRONTEND_PORT=5174
JWT_SECRET=mustahiq_secret_key_2026
LICENSE_SERVER_URL=https://api.absenta.id
PLATFORM_IP=103.129.148.127
```

### 3. `frontend/.env`

```env
VITE_BACKEND_PORT=5002
```

## Instalasi

Jalankan dari root project:

```bash
npm run install-all
```

Perintah ini akan memasang dependensi untuk `backend` dan `frontend`.

## Inisialisasi Database

Masuk ke folder backend lalu sinkronkan schema Prisma:

```bash
cd backend
npx prisma db push --accept-data-loss
```

Secara default database lokal akan dibuat sebagai file SQLite sesuai nilai `DATABASE_URL`.

## Menjalankan Saat Development

### Terminal 1 - Backend

```bash
npm run backend
```

### Terminal 2 - Frontend

```bash
npm run frontend
```

Setelah berjalan:

- Frontend: `http://localhost:5174`
- Backend health check: `http://localhost:5002/api/health`

## Menjalankan Manual Per Folder

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Build Frontend

```bash
cd frontend
npm run build
```

Untuk preview hasil build:

```bash
npm run preview -- --host 0.0.0.0 --port 5174
```

## Deployment

Project ini sudah menyiapkan dua pendekatan deploy:

### 1. Wizard Windows

Gunakan script:

```powershell
.\deploy.ps1
```

Wizard ini akan membantu:

- cek Node.js, npm, PM2, dan WireGuard
- membuat file `.env`
- install dependensi
- menjalankan `prisma db push`
- build frontend
- menjalankan service via PM2 atau terminal manual

### 2. PM2 via Ecosystem

Konfigurasi tersedia di `ecosystem.config.js`.

Contoh:

```bash
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

Mode produksi menjalankan:

- backend dengan `node src/server.js`
- frontend dengan `vite preview`

## Endpoint Penting

### Health Check

- `GET /api/health`

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Data Utama

- `/api/v1/mustahiq`
- `/api/v1/kategori`
- `/api/v1/kelompok`
- `/api/v1/program`
- `/api/v1/tenant`
- `/api/v1/users`

### Sistem dan Lisensi

- `/api/v1/license/*`
- `/api/v1/system/update/*`

## Alur Aplikasi Singkat

1. Admin mendaftarkan instansi dan akun pertama.
2. User login dan mendapatkan token JWT.
3. Frontend menyimpan token dan `tenant_id` di local storage.
4. Semua request API membawa token dan tenant aktif.
5. Admin mengelola mustahiq, kelompok, program, dan penyaluran.
6. Sistem dapat menghasilkan Excel, PDF SPJ, dan laporan pendukung.
7. Tenant dapat mengelola lisensi, tunnel, dan custom domain.

## Catatan Penting

- `README.md` ini merefleksikan kondisi proyek saat ini.
- Dokumentasi lama yang menyebut Expo tidak lagi sesuai dengan implementasi aktif di repo ini.
- Backend saat ini menggunakan Prisma dengan `sqlite`, bukan template Expo mobile app.
- Beberapa nama variabel environment masih membawa jejak penamaan lama, tetapi fungsinya tetap aktif di sistem sekarang.

## Lisensi

Lihat file `LICENSE`.
