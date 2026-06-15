#!/bin/bash

# Wizard Instalasi & Deployment - Project Yatim (Mustahiq Care)
# Untuk Linux (Ubuntu/Debian)

# Color variables
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function show_header() {
    clear
    echo -e "${CYAN}==========================================================================${NC}"
    echo -e "${CYAN}             WIZARD INSTALASI & DEPLOYMENT - PROJECT YATIM               ${NC}"
    echo -e "${CYAN}==========================================================================${NC}"
    if [ ! -z "$1" ]; then
        echo -e "${GREEN} [Menu] $1${NC}"
        echo -e "${CYAN}--------------------------------------------------------------------------${NC}"
    fi
}

function wait_key() {
    echo ""
    read -p "Tekan [ENTER] untuk kembali ke menu utama..." temp
}

# Default values
backend_port="5002"
frontend_port="5174"
license_url="https://api.absenta.id"

# Ambil konfigurasi yang sudah ada jika ada
if [ -f "backend/.env" ]; then
    val=$(grep "^PORT=" backend/.env | cut -d'=' -f2)
    if [ ! -z "$val" ]; then backend_port=$val; fi
fi
if [ -f ".env" ]; then
    val=$(grep "^EXPO_PUBLIC_LICENSE_SERVER_URL=" .env | cut -d'=' -f2)
    if [ ! -z "$val" ]; then license_url=$val; fi
fi

while true; do
    show_header "Menu Utama"
    echo -e " 1) Setup Lingkungan (Instal Node.js, PM2, Nginx)"
    echo -e " 2) Konfigurasi Port & Lingkungan (.env)"
    echo -e " 3) Migrasi Database & Kompilasi (Build) Frontend"
    echo -e " 4) Jalankan / Restart Aplikasi (PM2)"
    echo -e " 5) Lihat Status & Log Layanan"
    echo -e " 6) Konfigurasi Nginx Reverse Proxy (Opsional)"
    echo -e " 7) Keluar"
    echo -e "${CYAN}==========================================================================${NC}"
    read -p "Pilih menu [1-7]: " menu_choice

    case $menu_choice in
        1)
            show_header "1. Setup Lingkungan"
            echo -e "${YELLOW}Memperbarui package repository...${NC}"
            sudo apt-get update -y

            # Check NodeJS
            if ! command -v node &> /dev/null; then
                echo -e "${YELLOW}Node.js belum terdeteksi. Memasang Node.js LTS (v20)...${NC}"
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
            else
                echo -e "${GREEN}Node.js terdeteksi: $(node -v)${NC}"
            fi

            # Check Nginx
            if ! command -v nginx &> /dev/null; then
                echo -e "${YELLOW}Nginx belum terpasang. Memasang Nginx...${NC}"
                sudo apt-get install -y nginx
            else
                echo -e "${GREEN}Nginx terdeteksi: $(nginx -v 2>&1)${NC}"
            fi

            # Check PM2
            if ! command -v pm2 &> /dev/null; then
                echo -e "${YELLOW}PM2 belum terpasang. Memasang PM2 secara global...${NC}"
                sudo npm install -g pm2
            else
                echo -e "${GREEN}PM2 terdeteksi: $(pm2 -v)${NC}"
            fi

            echo -e "\n${GREEN}Setup lingkungan selesai!${NC}"
            wait_key
            ;;

        2)
            show_header "2. Konfigurasi Port & Lingkungan"
            echo -e "${YELLOW}Masukkan konfigurasi untuk aplikasi (tekan ENTER untuk default):${NC}\n"

            read -p "1. Port Backend Server [$backend_port]: " in_backend
            if [ ! -z "$in_backend" ]; then backend_port=$in_backend; fi

            read -p "2. Port Frontend Web App [$frontend_port]: " in_frontend
            if [ ! -z "$in_frontend" ]; then frontend_port=$in_frontend; fi

            read -p "3. URL Server Lisensi [$license_url]: " in_license
            if [ ! -z "$in_license" ]; then license_url=$in_license; fi

            echo -e "\n${YELLOW}Menulis konfigurasi ke file...${NC}"

            # Tulis backend/.env
            echo "PORT=$backend_port" > backend/.env
            echo "DATABASE_URL=\"file:./dev.db\"" >> backend/.env
            echo "FRONTEND_PORT=$frontend_port" >> backend/.env

            # Tulis root .env
            echo "EXPO_PUBLIC_LICENSE_SERVER_URL=$license_url" > .env

            # Tulis frontend/.env
            echo "VITE_BACKEND_PORT=$backend_port" > frontend/.env

            echo -e "${GREEN}Konfigurasi berhasil diperbarui!${NC}"
            echo -e " - Port Backend  : $backend_port"
            echo -e " - Port Frontend : $frontend_port"
            echo -e " - Server Lisensi: $license_url"
            wait_key
            ;;

        3)
            show_header "3. Migrasi Database & Build Frontend"
            echo -e "${YELLOW}1. Menginstal seluruh dependensi npm...${NC}"
            npm run install-all

            echo -e "\n${YELLOW}2. Menjalankan inisialisasi / migrasi database SQLite (Prisma)...${NC}"
            cd backend
            npx prisma db push --accept-data-loss
            cd ..

            echo -e "\n${YELLOW}3. Mengompilasi frontend React (Vite Build)...${NC}"
            cd frontend
            npm run build
            cd ..

            echo -e "\n${GREEN}Migrasi database dan build frontend berhasil diselesaikan!${NC}"
            wait_key
            ;;

        4)
            show_header "4. Jalankan / Restart Aplikasi (PM2)"
            if ! command -v pm2 &> /dev/null; then
                echo -e "${RED}Error: PM2 tidak terpasang di sistem! Jalankan menu 1 terlebih dahulu.${NC}"
                wait_key
                continue
            fi

            echo -e "${YELLOW}Menghentikan proses PM2 lama jika ada...${NC}"
            pm2 delete "mustahiq-backend" 2>/dev/null || true
            pm2 delete "mustahiq-frontend" 2>/dev/null || true

            echo -e "\n${YELLOW}Memulai server backend...${NC}"
            cd backend
            pm2 start src/server.js --name "mustahiq-backend"
            cd ..

            echo -e "\n${YELLOW}Memulai server frontend (Vite Preview)...${NC}"
            cd frontend
            pm2 start npm --name "mustahiq-frontend" -- run preview -- --port $frontend_port --host 0.0.0.0
            cd ..

            pm2 save
            echo -e "\n${GREEN}Layanan Project Yatim sukses berjalan di PM2!${NC}"
            pm2 status
            wait_key
            ;;

        5)
            show_header "5. Status & Log Layanan"
            if ! command -v pm2 &> /dev/null; then
                echo -e "${RED}Error: PM2 tidak terpasang!${NC}"
                wait_key
                continue
            fi

            echo -e "${GREEN}=== STATUS PM2 ===${NC}"
            pm2 status
            echo -e "\n${YELLOW}Link URL Akses Lokal:${NC}"
            echo -e " - Frontend Web: http://localhost:$frontend_port"
            echo -e " - Backend API : http://localhost:$backend_port/api/health"
            echo -e "\n${CYAN}Perintah berguna untuk pemantauan:${NC}"
            echo -e " - Lihat log backend : pm2 logs mustahiq-backend"
            echo -e " - Lihat log frontend: pm2 logs mustahiq-frontend"
            echo -e " - Mulai ulang semua : pm2 restart all"
            echo -e " - Hentikan semua    : pm2 stop all"
            wait_key
            ;;

        6)
            show_header "6. Konfigurasi Nginx Reverse Proxy"
            echo -e "Fitur ini akan menghasilkan template konfigurasi situs Nginx."
            read -p "Masukkan Domain atau IP Server Anda (contoh: yatim.absenta.id atau 10.10.10.250): " server_name
            if [ -z "$server_name" ]; then
                server_name="localhost"
            fi

            nginx_conf="/etc/nginx/sites-available/project-yatim"
            
            echo -e "\n${YELLOW}Berikut template konfigurasi Nginx:${NC}"
            echo -e "--------------------------------------------------------"
            cat <<EOF
server {
    listen 80;
    server_name $server_name;

    # Proxy Frontend (Vite Preview)
    location / {
        proxy_pass http://localhost:$frontend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy Backend API
    location /api {
        proxy_pass http://localhost:$backend_port/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
            echo -e "--------------------------------------------------------"
            
            echo -e "\nApakah Anda ingin menulis konfigurasi ini ke ${nginx_conf} sekarang? (Membutuhkan akses root)"
            read -p "Tulis konfigurasi? [y/N]: " write_nginx
            if [[ "$write_nginx" =~ ^[yY]$ ]]; then
                sudo tee $nginx_conf <<EOF
server {
    listen 80;
    server_name $server_name;

    location / {
        proxy_pass http://localhost:$frontend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:$backend_port/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
                echo -e "\n${YELLOW}Mengaktifkan konfigurasi situs dan me-restart Nginx...${NC}"
                sudo ln -sf $nginx_conf /etc/nginx/sites-enabled/
                sudo nginx -t
                sudo systemctl restart nginx
                echo -e "${GREEN}Nginx berhasil dikonfigurasi dan di-restart!${NC}"
            else
                echo -e "${YELLOW}Konfigurasi dibatalkan. Anda dapat mengkonfigurasinya secara manual menggunakan template di atas.${NC}"
            fi
            wait_key
            ;;

        7)
            echo -e "\n${GREEN}Terima kasih telah menggunakan Wizard Deployment. Sampai jumpa!${NC}"
            exit 0
            ;;

        *)
            echo -e "${RED}Pilihan tidak valid!${NC}"
            sleep 1
            ;;
    esac
done
