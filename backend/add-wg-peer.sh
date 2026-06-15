#!/bin/bash
# add-wg-peer.sh
# Usage: sudo add-wg-peer.sh <client_name> <public_key> <client_ip> <subdomain>

CLIENT_NAME=$1
PUBLIC_KEY=$2
CLIENT_IP=$3
SUBDOMAIN=$4

if [ -z "$CLIENT_NAME" ] || [ -z "$PUBLIC_KEY" ] || [ -z "$CLIENT_IP" ] || [ -z "$SUBDOMAIN" ]; then
    echo "Usage: sudo add-wg-peer.sh <client_name> <public_key> <client_ip> <subdomain>"
    exit 1
fi

# 1. Add peer to WireGuard
wg set wg0 peer "$PUBLIC_KEY" allowed-ips "$CLIENT_IP/32"

# 2. Append to wg0.conf
cat <<EOF >> /etc/wireguard/wg0.conf

#$CLIENT_NAME
[Peer]
PublicKey = $PUBLIC_KEY
AllowedIPs = $CLIENT_IP/32
EOF

# 3. Create Nginx config
NGINX_CONF="/etc/nginx/sites-available/$SUBDOMAIN.absenta.id"
NGINX_LINK="/etc/nginx/sites-enabled/$SUBDOMAIN.absenta.id"

cat <<EOF > "$NGINX_CONF"
server {
    server_name $SUBDOMAIN.absenta.id;

    location /api {
        proxy_pass http://$CLIENT_IP:5002;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://$CLIENT_IP:5174;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Support WebSockets for Vite HMR
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable Nginx config if not already enabled
if [ ! -f "$NGINX_LINK" ]; then
    ln -s "$NGINX_CONF" "$NGINX_LINK"
fi

# Reload Nginx
nginx -t && systemctl reload nginx
