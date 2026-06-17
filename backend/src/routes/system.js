const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middlewares/auth');

const projectRoot = path.join(__dirname, '..', '..', '..');
const progressFile = path.join(projectRoot, 'update-progress.json');

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Administrator yang dapat mengakses menu ini.' });
  }
};

function updateProgress(data) {
  try {
    fs.writeFileSync(progressFile, JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (e) {
    console.error('Failed to write progress file:', e);
  }
}

function getProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    }
  } catch (e) {}
  return { status: 'idle', step: 'done', message: 'Tidak ada pembaruan aktif.' };
}

// Helper to run shell commands as promises
// Includes node_modules/.bin in PATH so local binaries (vite, prisma, etc.) can be found
const execPromise = (cmd, cwd) => {
  return new Promise((resolve, reject) => {
    // Build a PATH that includes node_modules/.bin from the cwd so tools like vite are found
    const localBin = cwd ? path.join(cwd, 'node_modules', '.bin') : '';
    const envPath = localBin
      ? `${localBin}${path.delimiter}${process.env.PATH || ''}`
      : (process.env.PATH || '');

    exec(cmd, { cwd, timeout: 300000, env: { ...process.env, PATH: envPath } }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr, stdout });
      } else {
        resolve(stdout);
      }
    });
  });
};

// 1. GET /api/v1/system/update/check
router.get('/update/check', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get current branch name
    exec('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot }, (branchErr, branchStdout) => {
      const branch = branchErr ? 'main' : branchStdout.trim() || 'main';

      // Run git fetch to retrieve latest catalog from GitHub
      exec('git fetch', { cwd: projectRoot, timeout: 15000 }, (fetchErr, fetchStdout, fetchStderr) => {
        if (fetchErr) {
          console.error('[Update Check] git fetch failed:', fetchStderr || fetchErr.message);
        }

        // Compare local HEAD to upstream origin/{branch}
        exec(`git log HEAD..origin/${branch} --oneline`, { cwd: projectRoot }, (logErr, logStdout, logStderr) => {
          if (logErr) {
            return res.status(500).json({ 
              success: false, 
              error: 'Gagal membandingkan status lokal dengan remote: ' + (logStderr || logErr.message) 
            });
          }

          const commits = logStdout.trim().split('\n').filter(Boolean).map(line => {
            const spaceIdx = line.indexOf(' ');
            if (spaceIdx === -1) return { hash: line, message: '' };
            return {
              hash: line.substring(0, spaceIdx),
              message: line.substring(spaceIdx + 1)
            };
          });

          res.json({
            success: true,
            isBehind: commits.length > 0,
            commits
          });
        });
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/v1/system/update/status
router.get('/update/status', verifyToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: getProgress()
  });
});

// 3. POST /api/v1/system/update/execute
router.post('/update/execute', verifyToken, requireAdmin, async (req, res) => {
  const current = getProgress();
  if (current.status === 'running') {
    return res.status(400).json({ 
      success: false, 
      error: 'Proses pembaruan sedang berjalan. Silakan tunggu hingga selesai.' 
    });
  }

  // Start background update process
  executeUpdateInBackground();

  res.json({
    success: true,
    message: 'Proses pembaruan aplikasi telah dimulai di latar belakang. Silakan pantau status pembaruan.'
  });
});

async function executeUpdateInBackground() {
  updateProgress({
    status: 'running',
    step: 'pulling',
    message: 'Menarik kode sumber terbaru dari GitHub...'
  });

  try {
    // Step 1: Git fetch + hard reset to always match remote (avoids "would be overwritten" errors)
    console.log('[Updater] Fetching latest code from remote...');
    await execPromise('git fetch origin', projectRoot);
    // Detect current branch dynamically
    let branch = 'main';
    try { branch = (await execPromise('git rev-parse --abbrev-ref HEAD', projectRoot)).trim(); } catch (_) {}
    console.log(`[Updater] Resetting to origin/${branch}...`);
    await execPromise(`git reset --hard origin/${branch}`, projectRoot);

    // Step 2: Install dependencies
    updateProgress({
      status: 'running',
      step: 'installing',
      message: 'Memasang/memperbarui paket library (npm install)...'
    });
    console.log('[Updater] Installing dependencies...');
    await execPromise('npm run install-all', projectRoot);

    // Step 3: Database schema updates
    updateProgress({
      status: 'running',
      step: 'migrating',
      message: 'Menyinkronkan skema database SQLite (Prisma db push)...'
    });
    console.log('[Updater] Migrating database...');
    await execPromise('npx prisma db push --accept-data-loss', path.join(projectRoot, 'backend'));

    // Step 4: Recompile frontend bundle
    updateProgress({
      status: 'running',
      step: 'building',
      message: 'Membangun ulang bundel statis frontend (Vite Build)...'
    });
    console.log('[Updater] Building frontend assets...');
    await execPromise('npm run build', path.join(projectRoot, 'frontend'));

    // Step 5: Finished and triggering restart
    updateProgress({
      status: 'success',
      step: 'done',
      message: 'Aplikasi berhasil diperbarui! Memuat ulang layanan...'
    });
    console.log('[Updater] Update completed successfully. Reloading PM2 services...');

    setTimeout(() => {
      // Use pm2 restart all as primary strategy since process names include dynamic port numbers
      // e.g. 'mustahiq-backend:5002', 'mustahiq-frontend:5174'
      exec('pm2 restart all', (pm2Err) => {
        if (pm2Err) {
          console.warn('[Updater] pm2 restart all failed:', pm2Err.message);
          // Fallback: try to restart using pattern match
          exec('pm2 restart /mustahiq/', (pm2Err2) => {
            if (pm2Err2) {
              console.warn('[Updater] pm2 pattern restart also failed:', pm2Err2.message);
            }
          });
        }
      });
    }, 2000);

  } catch (errPayload) {
    console.error('[Updater] Update failed:', errPayload);
    updateProgress({
      status: 'failed',
      step: 'error',
      message: 'Gagal melakukan pembaruan aplikasi.',
      error: errPayload.stderr || errPayload.error?.message || String(errPayload)
    });
  }
}

module.exports = router;
