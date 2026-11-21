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

  // Let's hook App.jsx behavior to see if nudging currentTime=0.001 in loadedmetadata achieves 100% pixels
  await page.evaluate(() => {
    const v = document.querySelector('video');
    v.addEventListener('loadedmetadata', () => {
      console.log('Hook: loadedmetadata fired, setting currentTime = 0.001');
      v.currentTime = 0.001;
    });
  });

  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);

  // Wait 500ms without touching play
  await page.waitForTimeout(600);

  const analysis = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const imgData = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonZero = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      if (imgData[i] !== 0 || imgData[i+1] !== 0 || imgData[i+2] !== 0) nonZero++;
    }
    return {
      paused: v.paused,
      currentTime: v.currentTime,
      readyState: v.readyState,
      totalPixels: c.width * c.height,
      nonZeroPixels: nonZero,
      percentagePainted: Math.round((nonZero / (c.width * c.height)) * 100) + '%'
    };
  });

  console.log('Analysis on upload with currentTime=0.001 (NO PLAY):', analysis);

  await browser.close();
})();
