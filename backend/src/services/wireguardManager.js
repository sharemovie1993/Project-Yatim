const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WINDOWS_WG_PATH = 'C:\\Program Files\\WireGuard\\wireguard.exe';
const CONFIG_FILE_NAME = 'wg0-client';
const CONFIG_PATH = path.join(__dirname, `../../${CONFIG_FILE_NAME}.conf`);
const SERVICE_NAME = `WireGuardTunnel$${CONFIG_FILE_NAME}`;

class WireguardManager {
  static isWindows() {
    return os.platform() === 'win32';
  }

  static isAdmin() {
    try {
      execSync('net session', { stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }

  static getConfPath() {
    return CONFIG_PATH;
  }

  static hasConfig() {
    return fs.existsSync(CONFIG_PATH);
  }

  static getStatus() {
    if (!this.hasConfig()) {
      return { status: 'not_configured', message: 'Konfigurasi VPN belum dibuat.' };
    }

    try {
      if (this.isWindows()) {
        // Check if Windows service is running
        try {
          const stdout = execSync(`sc query "${SERVICE_NAME}"`, { stdio: 'pipe' }).toString();
          if (stdout.includes('RUNNING')) {
            return { status: 'connected', ip: this.getClientIp() };
          }
          if (stdout.includes('STOPPED')) {
            return { status: 'disconnected', ip: this.getClientIp() };
          }
          return { status: 'installed', ip: this.getClientIp() };
        } catch (e) {
          // Service not installed yet
          return { status: 'disconnected', ip: this.getClientIp() };
        }
      } else {
        // Linux: check if interface exists
        try {
          execSync(`ip link show ${CONFIG_FILE_NAME}`, { stdio: 'pipe' });
          return { status: 'connected', ip: this.getClientIp() };
        } catch (e) {
          return { status: 'disconnected', ip: this.getClientIp() };
        }
      }
    } catch (err) {
      return { status: 'disconnected', error: err.message };
    }
  }

  static getClientIp() {
    if (!this.hasConfig()) return '';
    try {
      const conf = fs.readFileSync(CONFIG_PATH, 'utf8');
      const match = conf.match(/Address\s*=\s*([0-9.]+)/i);
      return match ? match[1] : '';
    } catch (e) {
      return '';
    }
  }

  static setupFirewall() {
    try {
      if (this.isWindows()) {
        const ruleName = 'Mustahiq Care API Gateway Range';
        let ruleExists = false;
        try {
          const stdout = execSync(`netsh advfirewall firewall show rule name="${ruleName}"`, { stdio: 'pipe' }).toString();
          if (stdout.includes(ruleName)) {
            ruleExists = true;
          }
        } catch (e) {
          // Non-zero exit code if rule not found
        }

        if (!ruleExists) {
          console.log(`[WireguardManager] Creating Windows Firewall rule for ports 5000-5200...`);
          execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=5000-5200`, { stdio: 'pipe' });
        }
      } else {
        // Linux - UFW Check
        try {
          const ufwStatus = execSync('sudo ufw status', { stdio: 'pipe' }).toString();
          if (ufwStatus.includes('active')) {
            console.log('[WireguardManager] Allowing ports 5002, 5174 on UFW...');
            execSync('sudo ufw allow 5002/tcp', { stdio: 'pipe' });
            execSync('sudo ufw allow 5174/tcp', { stdio: 'pipe' });
          }
        } catch (e) {
          // UFW not active/present, try firewalld
          try {
            const firewallCmdStatus = execSync('sudo firewall-cmd --state', { stdio: 'pipe' }).toString();
            if (firewallCmdStatus.trim() === 'running') {
              console.log('[WireguardManager] Allowing ports 5002, 5174 on firewalld...');
              execSync('sudo firewall-cmd --zone=public --add-port=5002/tcp --permanent', { stdio: 'pipe' });
              execSync('sudo firewall-cmd --zone=public --add-port=5174/tcp --permanent', { stdio: 'pipe' });
              execSync('sudo firewall-cmd --reload', { stdio: 'pipe' });
            }
          } catch (err) {
            // No recognized active firewall tool found or failed, ignore
          }
        }
      }
    } catch (error) {
      console.warn('[WireguardManager] Warning: Gagal mengkonfigurasi inbound firewall rules secara otomatis:', error.message);
    }
  }

  static async startTunnel() {
    if (!this.hasConfig()) {
      throw new Error('File konfigurasi VPN tidak ditemukan. Silakan request konfigurasi terlebih dahulu.');
    }

    if (this.isWindows()) {
      if (!fs.existsSync(WINDOWS_WG_PATH)) {
        throw new Error(`Wireguard tidak terinstall di: ${WINDOWS_WG_PATH}. Silakan install Wireguard Windows Client.`);
      }

      // Check if Node process has admin privileges
      if (!this.isAdmin()) {
        console.log('[WireguardManager] Node process is not admin. Launching elevated PowerShell script via EncodedCommand...');
        // Pure powershell command, no nested double quote issues
        const psCode = `
          $ruleName = 'Mustahiq Care API Gateway Range';
          netsh advfirewall firewall show rule name="$ruleName" 2>$null;
          if ($LASTEXITCODE -ne 0) {
            netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=5000-5200
          }
          sc.exe query '${SERVICE_NAME}' 2>$null;
          if ($LASTEXITCODE -ne 0) {
            Start-Process "${WINDOWS_WG_PATH}" -ArgumentList '/installtunnelservice',"${CONFIG_PATH}" -Wait
          }
          net start '${SERVICE_NAME}'
        `.trim();

        try {
          const codeBuffer = Buffer.from(psCode, 'utf16le');
          const codeBase64 = codeBuffer.toString('base64');
          
          const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
          const outerBuffer = Buffer.from(outerCode, 'utf16le');
          const outerBase64 = outerBuffer.toString('base64');
          
          execSync(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { stdio: 'pipe' });
          return { success: true, message: 'Tunnel VPN berhasil diaktifkan.' };
        } catch (err) {
          console.error('[WireguardManager] UAC start tunnel error:', err.message);
          throw new Error('Gagal mengaktifkan VPN: Pengguna membatalkan izin Administrator (UAC) atau UAC gagal ditampilkan.');
        }
      }

      // If already admin, proceed normally
      this.setupFirewall();

      // Check if service is already installed, if not install it
      let serviceExists = false;
      try {
        execSync(`sc query "${SERVICE_NAME}"`, { stdio: 'pipe' });
        serviceExists = true;
      } catch (e) {}

      if (!serviceExists) {
        try {
          console.log(`[WireguardManager] Installing tunnel service: ${SERVICE_NAME}`);
          execSync(`"${WINDOWS_WG_PATH}" /installtunnelservice "${CONFIG_PATH}"`, { stdio: 'pipe' });
        } catch (err) {
          throw new Error('Gagal memasang Tunnel Service. Pastikan menjalankan server lokal sebagai Administrator.');
        }
      }

      // Start service
      try {
        execSync(`net start "${SERVICE_NAME}"`, { stdio: 'pipe' });
        return { success: true, message: 'Tunnel VPN berhasil diaktifkan.' };
      } catch (err) {
        throw new Error('Gagal mengaktifkan service VPN. Pastikan server lokal dijalankan sebagai Administrator.');
      }
    } else {
      // Linux
      this.setupFirewall();
      try {
        execSync(`sudo wg-quick up "${CONFIG_PATH}"`, { stdio: 'pipe' });
        return { success: true, message: 'Tunnel VPN berhasil diaktifkan.' };
      } catch (err) {
        throw new Error('Gagal mengaktifkan Wireguard (wg-quick): ' + err.message);
      }
    }
  }

  static async stopTunnel() {
    if (!this.hasConfig()) {
      throw new Error('File konfigurasi VPN tidak ditemukan.');
    }

    if (this.isWindows()) {
      if (!this.isAdmin()) {
        console.log('[WireguardManager] Node process is not admin. Launching elevated PowerShell stop script via EncodedCommand...');
        const psCode = `net stop '${SERVICE_NAME}'`.trim();
        try {
          const codeBuffer = Buffer.from(psCode, 'utf16le');
          const codeBase64 = codeBuffer.toString('base64');
          
          const outerCode = `Start-Process powershell -ArgumentList "-NoProfile -WindowStyle Hidden -EncodedCommand ${codeBase64}" -Verb RunAs -Wait`;
          const outerBuffer = Buffer.from(outerCode, 'utf16le');
          const outerBase64 = outerBuffer.toString('base64');
          
          execSync(`powershell -NoProfile -EncodedCommand ${outerBase64}`, { stdio: 'pipe' });
          return { success: true, message: 'Tunnel VPN berhasil dinonaktifkan.' };
        } catch (err) {
          console.error('[WireguardManager] UAC stop tunnel error:', err.message);
          throw new Error('Gagal menonaktifkan VPN: Pengguna membatalkan izin Administrator (UAC) atau UAC gagal ditampilkan.');
        }
      }

      try {
        execSync(`net stop "${SERVICE_NAME}"`, { stdio: 'pipe' });
        return { success: true, message: 'Tunnel VPN berhasil dinonaktifkan.' };
      } catch (err) {
        return { success: true, message: 'Tunnel VPN sudah dinonaktifkan.' };
      }
    } else {
      // Linux
      try {
        execSync(`sudo wg-quick down "${CONFIG_PATH}"`, { stdio: 'pipe' });
        return { success: true, message: 'Tunnel VPN berhasil dinonaktifkan.' };
      } catch (err) {
        return { success: true, message: 'Tunnel VPN sudah dinonaktifkan.' };
      }
    }
  }
}

module.exports = WireguardManager;
