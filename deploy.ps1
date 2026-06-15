# Wizard Instalasi & Deployment - Project Yatim (Mustahiq Care)
# Untuk Windows PowerShell

$ErrorActionPreference = "Stop"

# Mengonfigurasi ExecutionPolicy agar berkas script global npm (seperti PM2) dapat berjalan
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue
} catch {}


function Show-Header {
    param ($StepTitle)
    Clear-Host
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "             WIZARD INSTALASI & DEPLOYMENT - PROJECT YATIM               " -ForegroundColor Yellow -Bold
    Write-Host "==========================================================================" -ForegroundColor Cyan
    if ($StepTitle) {
        Write-Host " [Langkah] $StepTitle" -ForegroundColor Green
        Write-Host "--------------------------------------------------------------------------" -ForegroundColor Gray
    }
}

# ----------------------------------------------------
# LANGKAH 0: Selamat Datang / Welcome Screen
# ----------------------------------------------------
Show-Header
Write-Host "Selamat datang di Wizard Deployment Project Yatim." -ForegroundColor White
Write-Host "Wizard ini akan memandu Anda melakukan deployment backend dan frontend secara lokal." -ForegroundColor White
Write-Host ""
Write-Host "Proses ini mencakup:"
Write-Host " 1. Pemeriksaan Prasyarat Sistem (Node.js, NPM, PM2)"
Write-Host " 2. Konfigurasi Port & Lingkungan (Port Frontend & Backend)"
Write-Host " 3. Inisialisasi Database SQLite (Prisma)"
Write-Host " 4. Build Frontend Kompilasi Aset Statis (Vite)"
Write-Host " 5. Menjalankan Layanan (PM2 Background atau Terminal Baru)"
Write-Host ""
Write-Host "Tekan [Y] untuk melanjutkan, atau tombol lain untuk keluar."
$key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
if ($key.Character -ne 'y' -and $key.Character -ne 'Y') {
    Write-Host "Instalasi dibatalkan oleh pengguna." -ForegroundColor Red
    Exit
}

# ----------------------------------------------------
# LANGKAH 1: Pemeriksaan Prasyarat Sistem
# ----------------------------------------------------
Show-Header "1 / 5 - Pemeriksaan Prasyarat Sistem"
$hasNode = $false
$hasNpm = $false
$hasPM2 = $false

Write-Host "Memeriksa Node.js... " -NoNewline
try {
    $nodeVer = node -v
    Write-Host "OK ($nodeVer)" -ForegroundColor Green
    $hasNode = $true
} catch {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
    $hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
    if ($hasWinget) {
        Write-Host "Sistem mendeteksi Windows Package Manager (winget) tersedia." -ForegroundColor Cyan
        Write-Host "Apakah Anda ingin memasang Node.js LTS secara otomatis?"
        Write-Host "Tekan [Y] untuk memasang Node.js, atau tombol lain untuk melewatinya."
        $nodeKey = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        if ($nodeKey.Character -eq 'y' -or $nodeKey.Character -eq 'Y') {
            Write-Host "Memulai pemasangan Node.js LTS... Mohon tunggu..." -ForegroundColor Cyan
            Start-Process winget -ArgumentList "install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements" -Wait
            
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            try {
                $nodeVer = node -v
                Write-Host "Node.js berhasil terpasang!" -ForegroundColor Green
                $hasNode = $true
            } catch {
                Write-Host "Pemasangan selesai. Anda perlu membuka kembali terminal baru untuk menjalankan perintah node." -ForegroundColor Yellow
                $hasNode = $true
            }
        }
    }
    
    if (-not $hasNode) {
        Write-Host "Kesalahan: Node.js tidak terdeteksi di sistem Anda!" -ForegroundColor Red
        Write-Host "Silakan unduh dan instal Node.js versi LTS (versi 18+) dari https://nodejs.org/" -ForegroundColor Yellow
        Read-Host "Tekan [ENTER] untuk keluar..."
        Exit
    }
}

Write-Host "Memeriksa NPM... " -NoNewline
try {
    $npmVer = npm -v
    Write-Host "OK ($npmVer)" -ForegroundColor Green
    $hasNpm = $true
} catch {
    # Try refreshing PATH one more time in case it just got updated
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    try {
        $npmVer = npm -v
        Write-Host "OK ($npmVer)" -ForegroundColor Green
        $hasNpm = $true
    } catch {
        Write-Host "GAGAL" -ForegroundColor Red
        Write-Host "Kesalahan: NPM tidak terdeteksi!" -ForegroundColor Red
        Write-Host "Info: Jika Anda baru saja memasang Node.js secara otomatis, silakan TUTUP terminal ini dan BUKA kembali terminal baru, lalu jalankan skrip deploy ini kembali agar sistem dapat membaca PATH Node/NPM baru." -ForegroundColor Yellow
        Read-Host "Tekan [ENTER] untuk keluar..."
        Exit
    }
}

Write-Host "Memeriksa PM2 (Process Manager)... " -NoNewline
$pm2Path = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Path) {
    Write-Host "OK (Terpasang)" -ForegroundColor Green
    $hasPM2 = $true
} else {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Info: PM2 direkomendasikan untuk menjalankan aplikasi di latar belakang (background service)." -ForegroundColor Gray
    Write-Host "Apakah Anda ingin menginstal PM2 secara global menggunakan NPM sekarang?"
    Write-Host "Tekan [Y] untuk Pasang PM2, atau [ENTER] untuk melewatinya (menggunakan mode manual)."
    $pm2Key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($pm2Key.Character -eq 'y' -or $pm2Key.Character -eq 'Y') {
        Write-Host "Memulai instalasi PM2 secara global... Mohon tunggu..." -ForegroundColor Cyan
        try {
            npm install -g pm2
            Write-Host "PM2 berhasil terpasang secara global!" -ForegroundColor Green
            $hasPM2 = $true
        } catch {
            Write-Host "Pemasangan PM2 gagal. Kami akan menggunakan mode manual nanti." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Pemasangan PM2 dilewati." -ForegroundColor Gray
    }
}

# Memeriksa WireGuard Client
Write-Host "Memeriksa WireGuard Client... " -NoNewline
$hasWG = Test-Path "C:\Program Files\WireGuard\wireguard.exe"
if ($hasWG) {
    Write-Host "OK (Terpasang)" -ForegroundColor Green
} else {
    Write-Host "BELUM TERPASANG" -ForegroundColor Yellow
    $hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
    if ($hasWinget) {
        Write-Host ""
        Write-Host "Info: WireGuard Client dibutuhkan jika Anda ingin menggunakan fitur Online Gateway (VPN Tunnel)." -ForegroundColor Gray
        Write-Host "Apakah Anda ingin memasang WireGuard Client secara otomatis?"
        Write-Host "Tekan [Y] untuk memasang WireGuard, atau tombol lain untuk melewatinya."
        $wgKey = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        if ($wgKey.Character -eq 'y' -or $wgKey.Character -eq 'Y') {
            Write-Host "Memulai pemasangan WireGuard Client... Mohon tunggu..." -ForegroundColor Cyan
            Start-Process winget -ArgumentList "install WireGuard.WireGuard --silent --accept-package-agreements --accept-source-agreements" -Wait
            
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            if (Test-Path "C:\Program Files\WireGuard\wireguard.exe") {
                Write-Host "WireGuard Client berhasil terpasang!" -ForegroundColor Green
            } else {
                Write-Host "Pemasangan selesai. Silakan verifikasi ketersediaan aplikasi WireGuard." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Info: WireGuard Client tidak terdeteksi. Silakan unduh dari https://www.wireguard.com/install/ jika ingin menggunakan VPN Tunnel." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Pemeriksaan prasyarat selesai!" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk melanjutkan ke konfigurasi port..."

# ----------------------------------------------------
# LANGKAH 2: Konfigurasi Port & Lingkungan
# ----------------------------------------------------
$backendPort = "5002"
$frontendPort = "5174"
$licenseUrl = "https://api.absenta.id"

# Coba ambil default dari .env lama jika ada
if (Test-Path "backend/.env") {
    $content = Get-Content "backend/.env"
    foreach ($line in $content) {
        if ($line -match "^PORT=(\d+)") { $backendPort = $Matches[1] }
    }
}
if (Test-Path ".env") {
    $content = Get-Content ".env"
    foreach ($line in $content) {
        if ($line -match "^EXPO_PUBLIC_LICENSE_SERVER_URL=(.+)") { $licenseUrl = $Matches[1].Trim() }
    }
}

$confirmed = $false
while (-not $confirmed) {
    Show-Header "2 / 5 - Konfigurasi Port & Lingkungan"
    Write-Host "Silakan masukkan port dan konfigurasi server di bawah ini." -ForegroundColor White
    Write-Host "Tekan [ENTER] jika ingin menggunakan nilai default di dalam tanda kurung siku." -ForegroundColor Gray
    Write-Host ""

    # Input Port Backend
    $inBackend = Read-Host "1. Port Backend Server [$backendPort]"
    if (-not [string]::IsNullOrWhiteSpace($inBackend)) {
        if ($inBackend -match "^\d+$") {
            $backendPort = $inBackend
        } else {
            Write-Host "Input salah. Menggunakan default: $backendPort" -ForegroundColor Yellow
        }
    }

    # Input Port Frontend
    $inFrontend = Read-Host "2. Port Frontend Web App [$frontendPort]"
    if (-not [string]::IsNullOrWhiteSpace($inFrontend)) {
        if ($inFrontend -match "^\d+$") {
            $frontendPort = $inFrontend
        } else {
            Write-Host "Input salah. Menggunakan default: $frontendPort" -ForegroundColor Yellow
        }
    }

    # Input License Server URL
    $inLicense = Read-Host "3. URL Server Lisensi [$licenseUrl]"
    if (-not [string]::IsNullOrWhiteSpace($inLicense)) {
        $licenseUrl = $inLicense
    }

    Write-Host ""
    Write-Host "--- RINGKASAN KONFIGURASI ---" -ForegroundColor Yellow
    Write-Host " - Port Backend  : $backendPort" -ForegroundColor White
    Write-Host " - Port Frontend : $frontendPort" -ForegroundColor White
    Write-Host " - Server Lisensi: $licenseUrl" -ForegroundColor White
    Write-Host "-----------------------------" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Apakah konfigurasi di atas sudah benar? [Y/n]"
    $confKey = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($confKey.Character -eq 'n' -or $confKey.Character -eq 'N') {
        # Loop lagi
    } else {
        $confirmed = $true
    }
}

# Tulis File Config
Write-Host "Menulis konfigurasi ke file lingkungan (.env)..." -ForegroundColor Cyan

# backend/.env
$backendEnvContent = @"
PORT=$backendPort
DATABASE_URL="file:./dev.db"
FRONTEND_PORT=$frontendPort
"@
[System.IO.File]::WriteAllText("backend/.env", $backendEnvContent)

# Root .env (Lisensi)
$rootEnvContent = @"
EXPO_PUBLIC_LICENSE_SERVER_URL=$licenseUrl
"@
[System.IO.File]::WriteAllText(".env", $rootEnvContent)

# frontend/.env
$frontendEnvContent = @"
VITE_BACKEND_PORT=$backendPort
"@
[System.IO.File]::WriteAllText("frontend/.env", $frontendEnvContent)

Write-Host "File konfigurasi berhasil dibuat!" -ForegroundColor Green
Write-Host ""
Read-Host "Tekan [ENTER] untuk memulai instalasi dependensi & database..."

# ----------------------------------------------------
# LANGKAH 3: Instalasi Dependensi & Inisialisasi Database
# ----------------------------------------------------
Show-Header "3 / 5 - Instalasi Dependensi & Database SQLite"
Write-Host "1. Menginstal dependensi untuk backend dan frontend... " -ForegroundColor Yellow
Write-Host "Proses ini dapat memakan waktu 1-2 menit tergantung koneksi internet Anda." -ForegroundColor Gray
Write-Host ""

# Jalankan install-all
npm run install-all

if ($LASTEXITCODE -ne 0) {
    Write-Host "GAGAL: Terjadi kesalahan saat menginstal package npm." -ForegroundColor Red
    Read-Host "Tekan [ENTER] untuk keluar..."
    Exit
}
Write-Host "Instalasi npm paket sukses!" -ForegroundColor Green
Write-Host ""

Write-Host "2. Menginisialisasi skema database SQLite (Prisma DB Push)..." -ForegroundColor Yellow
Push-Location backend
try {
    npx prisma db push --accept-data-loss
    Write-Host "Database SQLite berhasil dibuat/diperbarui!" -ForegroundColor Green
} catch {
    Write-Host "GAGAL: Gagal melakukan sinkronisasi database Prisma!" -ForegroundColor Red
    Pop-Location
    Read-Host "Tekan [ENTER] untuk keluar..."
    Exit
}
Pop-Location

Write-Host ""
Write-Host "Langkah 3 selesai sepenuhnya!" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk mengompilasi Frontend (Build)..."

# ----------------------------------------------------
# LANGKAH 4: Build Frontend
# ----------------------------------------------------
Show-Header "4 / 5 - Kompilasi Aset Statis Frontend (Build)"
Write-Host "Mengompilasi frontend React menggunakan Vite..." -ForegroundColor Yellow
Write-Host "Proses ini mengoptimalkan ukuran bundel web untuk kecepatan akses produksi." -ForegroundColor Gray
Write-Host ""

Push-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "GAGAL: Kompilasi frontend gagal!" -ForegroundColor Red
    Pop-Location
    Read-Host "Tekan [ENTER] untuk keluar..."
    Exit
}
Pop-Location

Write-Host ""
Write-Host "Kompilasi frontend berhasil!" -ForegroundColor Green
Read-Host "Tekan [ENTER] untuk menjalankan layanan aplikasi..."

# ----------------------------------------------------
# LANGKAH 5: Jalankan Layanan
# ----------------------------------------------------
Show-Header "5 / 5 - Jalankan Layanan Aplikasi"
$usePM2 = $false

if ($hasPM2) {
    Write-Host "Sistem mendeteksi PM2 terpasang." -ForegroundColor Green
    Write-Host "Bagaimana Anda ingin menjalankan layanan?"
    Write-Host " 1. [PM2] Jalankan di background (Direkomendasikan)"
    Write-Host " 2. [Manual] Jalankan di Window Terminal baru (Terbuka)"
    Write-Host ""
    $runChoice = Read-Host "Pilih opsi [1]"
    if ($runChoice -eq "2") {
        $usePM2 = $false
    } else {
        $usePM2 = $true
    }
} else {
    Write-Host "PM2 tidak terpasang. Layanan akan dijalankan dalam mode Manual." -ForegroundColor Yellow
    $usePM2 = $false
}

if ($usePM2) {
    Write-Host "Menghentikan layanan Project Yatim yang sudah ada di PM2 (jika ada)..." -ForegroundColor Gray
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & pm2 delete "mustahiq-backend" 2>&1 | Out-Null
        & pm2 delete "mustahiq-frontend" 2>&1 | Out-Null
    } catch {}
    $ErrorActionPreference = $oldEAP

    Write-Host "Memulai server backend di PM2..." -ForegroundColor Yellow
    Push-Location backend
    & pm2 start src/server.js --name "mustahiq-backend" --cwd "$PSScriptRoot\backend"
    Pop-Location

    Write-Host "Memulai server frontend (Vite Preview) di PM2..." -ForegroundColor Yellow
    Push-Location frontend
    & pm2 start node_modules/vite/bin/vite.js --name "mustahiq-frontend" --cwd "$PSScriptRoot\frontend" -- preview --port $frontendPort --host 0.0.0.0
    Pop-Location

    & pm2 save
    Write-Host "Layanan sukses didaftarkan dan dijalankan di PM2!" -ForegroundColor Green
} else {
    Write-Host "Membuka window PowerShell baru untuk Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Title Mustahiq-Backend; npm start"
    
    Write-Host "Membuka window PowerShell baru untuk Frontend (Vite Preview)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Title Mustahiq-Frontend; npm run preview -- --port $frontendPort --host 0.0.0.0"

    Write-Host "Layanan diluncurkan di terminal terpisah!" -ForegroundColor Green
}

# ----------------------------------------------------
# SELESAI / Finish Summary
# ----------------------------------------------------
Show-Header "Selesai - Deployment Berhasil!"
Write-Host "Aplikasi Project Yatim berhasil di-deploy!" -ForegroundColor Green
Write-Host ""
Write-Host "Detail Akses Aplikasi:" -ForegroundColor Yellow
Write-Host " - Frontend Web: http://localhost:$frontendPort" -ForegroundColor White
Write-Host " - Backend API : http://localhost:$backendPort/api/health" -ForegroundColor White
Write-Host ""
if ($usePM2) {
    Write-Host "Status PM2 saat ini:" -ForegroundColor Gray
    & pm2 status
    Write-Host ""
    Write-Host "Perintah berguna PM2:" -ForegroundColor Yellow
    Write-Host " - Lihat log backend : pm2 logs mustahiq-backend"
    Write-Host " - Lihat log frontend: pm2 logs mustahiq-frontend"
    Write-Host " - Hentikan aplikasi : pm2 stop all"
} else {
    Write-Host "PENTING: Jangan tutup jendela terminal Backend / Frontend yang baru terbuka" -ForegroundColor Red
    Write-Host "agar server tetap dapat melayani permintaan web." -ForegroundColor Red
}
Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Terima kasih telah menggunakan Wizard Instalasi. Selamat bertugas!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Tekan [ENTER] untuk mengakhiri wizard..."
