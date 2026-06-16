const fs = require('fs');
const path = require('path');

// Helper to read and parse a .env file dynamically
function readEnv(filePath) {
  const env = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            // Remove surrounding quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    console.error(`[PM2 Ecosystem] Error reading env file at ${filePath}:`, err);
  }
  return env;
}

// Load configurations from env files
const rootEnv = readEnv(path.join(__dirname, '.env'));
const backendEnv = readEnv(path.join(__dirname, 'backend', '.env'));
const frontendEnv = readEnv(path.join(__dirname, 'frontend', '.env'));

// Dynamic Port Configuration (Fallbacks to defaults if not set)
const backendPort = process.env.PORT || backendEnv.PORT || '5002';
const frontendPort = process.env.FRONTEND_PORT || backendEnv.FRONTEND_PORT || '5174';

// Print a beautiful summary in terminal when PM2 loads/executes this config file
console.log('\x1b[36m==================================================\x1b[0m');
console.log('\x1b[32m       🚀  PROJECT YATIM DEPLOYMENT INFO  🚀       \x1b[0m');
console.log('\x1b[36m==================================================\x1b[0m');
console.log(` 🌐 Backend API : \x1b[35mhttp://localhost:${backendPort}\x1b[0m`);
console.log(` 💻 Frontend Web: \x1b[35mhttp://localhost:${frontendPort}\x1b[0m`);
console.log('\x1b[36m==================================================\x1b[0m\n');

module.exports = {
  apps: [
    {
      name: `mustahiq-backend:${backendPort}`,
      script: 'src/server.js',
      cwd: path.join(__dirname, 'backend'),
      env: {
        NODE_ENV: 'production',
        PORT: backendPort,
        DATABASE_URL: backendEnv.DATABASE_URL || 'file:./dev.db',
        FRONTEND_PORT: frontendPort,
        ...backendEnv
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: `mustahiq-frontend:${frontendPort}`,
      script: 'node_modules/vite/bin/vite.js',
      args: `preview --port ${frontendPort} --host 0.0.0.0`,
      cwd: path.join(__dirname, 'frontend'),
      env: {
        NODE_ENV: 'production',
        ...frontendEnv
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
