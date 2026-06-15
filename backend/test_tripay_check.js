const https = require('https');

const LICENSE_SERVER_URL = 'https://api.absenta.id';

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Sending request to license server...');
    const reqData = await postJson(`${LICENSE_SERVER_URL}/api/license/request`, {
      school_name: 'Yayasan Uji Coba Gemini (Mustahiq Care Basic (Lifetime))',
      device_limit: 99999,
      is_unlimited: 1,
      product_id: 'project-yatim',
      plan_id: 'yatim_basic_lifetime',
      payment_method: 'QRIS'
    });
    
    console.log('Request response:', JSON.stringify(reqData, null, 2));
    
    if (reqData.success && reqData.data) {
      const key = reqData.data.license_key;
      console.log(`Checking status for license key: ${key}...`);
      
      const checkData = await getJson(`${LICENSE_SERVER_URL}/api/license/check/${key}?device_id=DEV-WEB`);
      console.log('Check response:', JSON.stringify(checkData, null, 2));
    }
  } catch (e) {
    console.error('Error occurred:', e);
  }
}

run();
