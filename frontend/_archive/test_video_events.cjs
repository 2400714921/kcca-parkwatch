const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

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

  // Let's hook video element before upload to test currentTime nudging
  await page.evaluate(() => {
    const v = document.querySelector('video');
    window._videoEvents = [];
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'seeked', 'timeupdate'].forEach(evt => {
      v.addEventListener(evt, () => window._videoEvents.push({ evt, readyState: v.readyState, time: v.currentTime }));
    });
  });

  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);

  await page.waitForTimeout(600);

  const events = await page.evaluate(() => window._videoEvents);
  console.log('Video events fired:', events);

  const canvasPx = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const imgData = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonZero = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      if (imgData[i] !== 0 || imgData[i+1] !== 0 || imgData[i+2] !== 0) nonZero++;
    }
    return { width: c.width, height: c.height, nonZero, total: c.width * c.height };
  });
  console.log('Canvas without spots (pure video pixels):', canvasPx);

  // Now test what happens if we set currentTime = 0.001
  console.log('Nudging currentTime = 0.001...');
  await page.evaluate(() => {
    const v = document.querySelector('video');
    v.currentTime = 0.001;
  });
  await page.waitForTimeout(400);

  const canvasPxAfterNudge = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const imgData = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonZero = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      if (imgData[i] !== 0 || imgData[i+1] !== 0 || imgData[i+2] !== 0) nonZero++;
    }
    return { nonZero, total: c.width * c.height };
  });
  console.log('Canvas after nudging currentTime:', canvasPxAfterNudge);

  await browser.close();
})();
