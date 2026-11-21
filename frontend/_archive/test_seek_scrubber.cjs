const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  await page.addInitScript(() => {
    localStorage.setItem('kcca_theme', 'dark');
    localStorage.setItem('parkingAreas', JSON.stringify([
      {
        id: 1700000001,
        name: 'City Square Telemetry Deck',
        location: 'Central Division, Kampala Road',
        totalCapacity: 50,
        createdAt: new Date().toISOString(),
        spots: [],
        spotDimensions: { width: 640, height: 360 },
        analytics: []
      }
    ]));
  });

  await page.goto('http://localhost:5173/login');
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  await page.goto('http://localhost:5173/dashboard/monitor/1700000001');
  await page.waitForSelector('h1:has-text("City Square Telemetry Deck")');

  // Let's hook video so we simulate our proposed App.jsx fix
  await page.evaluate(() => {
    const v = document.querySelector('video');
    v.preload = 'auto';
    v.addEventListener('loadedmetadata', () => {
      v.currentTime = 0.001;
    });
    v.addEventListener('seeked', () => {
      const c = document.querySelector('canvas');
      if (c && v.videoWidth) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(v, 0, 0, c.width, c.height);
      }
    });
  });

  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);
  await page.waitForTimeout(600);

  // Check upload frame (0.001s, NO PLAY)
  const uploadCheck = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonZero = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) nonZero++;
    }
    return {
      paused: v.paused,
      currentTime: v.currentTime,
      nonZero,
      total: c.width * c.height,
      percent: Math.round((nonZero / (c.width * c.height)) * 100) + '%'
    };
  });
  console.log('1. On Upload (No Play):', uploadCheck);

  // Seek to 0.20s without playing
  await page.evaluate(() => {
    const v = document.querySelector('video');
    v.currentTime = 0.20;
  });
  await page.waitForTimeout(400);

  const seekCheck = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonZero = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) nonZero++;
    }
    return {
      paused: v.paused,
      currentTime: v.currentTime,
      nonZero,
      total: c.width * c.height,
      percent: Math.round((nonZero / (c.width * c.height)) * 100) + '%'
    };
  });
  console.log('2. After Seek to 0.20s (No Play):', seekCheck);

  await browser.close();
})();
