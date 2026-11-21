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
        spots: [
          { id: 101, x1: 40, y1: 40, x2: 240, y2: 160 }
        ],
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

  // Upload clip.webm
  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);

  // Check state IMMEDIATELY after upload (NO PLAY PRESSED)
  await page.waitForTimeout(500);

  const state1 = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c ? c.getContext('2d') : null;
    const px = ctx ? ctx.getImageData(0, 0, c.width, c.height).data : [];
    let nonZero = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 0 || px[i+1] !== 0 || px[i+2] !== 0) nonZero++;
    }
    return {
      videoExists: !!v,
      readyState: v ? v.readyState : null,
      currentTime: v ? v.currentTime : null,
      paused: v ? v.paused : null,
      canvasWidth: c ? c.width : null,
      canvasHeight: c ? c.height : null,
      nonZeroPixels: nonZero
    };
  });

  console.log('State immediately after upload (no play):', state1);

  // Test seek without playing
  console.log('Seeking to 0.15s without playing...');
  const scrubber = page.locator('[data-testid="video-scrubber"]');
  const box = await scrubber.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height / 2);
    await page.waitForTimeout(500);
  }

  const state2 = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c ? c.getContext('2d') : null;
    const px = ctx ? ctx.getImageData(0, 0, c.width, c.height).data : [];
    let nonZero = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 0 || px[i+1] !== 0 || px[i+2] !== 0) nonZero++;
    }
    return {
      currentTime: v ? v.currentTime : null,
      paused: v ? v.paused : null,
      readyState: v ? v.readyState : null,
      nonZeroPixels: nonZero
    };
  });
  console.log('State after seeking without playing:', state2);

  await browser.close();
})();
