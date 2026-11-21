const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    localStorage.setItem('parkingAreas', JSON.stringify([
      {
        id: 1700000001,
        name: 'City Square Telemetry Deck',
        location: 'Central Division, Kampala Road',
        totalCapacity: 50,
        createdAt: new Date().toISOString(),
        spots: [
          { id: 1, x1: 50, y1: 50, x2: 200, y2: 150 }
        ],
        spotDimensions: { width: 640, height: 360 },
        analytics: []
      }
    ]));
  });

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  console.log('2. Navigating to /dashboard/monitor/1700000001...');
  await page.goto('http://localhost:5173/dashboard/monitor/1700000001');
  await page.waitForTimeout(1000);

  // Check upload input
  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  console.log('3. Uploading clip from:', clipPath);
  await fileInput.setInputFiles(clipPath);

  await page.waitForTimeout(1500);

  // Check if canvas is rendered
  const canvas = page.locator('canvas');
  const canvasCount = await canvas.count();
  console.log('Canvas count:', canvasCount);

  if (canvasCount > 0) {
    const canvasBox = await canvas.boundingBox();
    console.log('Canvas bounding box:', canvasBox);

    // Sample pixel data from canvas
    const sample = await page.evaluate(() => {
      const cv = document.querySelector('canvas');
      if (!cv) return null;
      const ctx = cv.getContext('2d');
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0 || data[i+3] !== 0) {
          nonZero++;
        }
      }
      return { width: cv.width, height: cv.height, totalPixels: cv.width * cv.height, nonZeroPixels: nonZero };
    });
    console.log('Canvas pixel analysis:', sample);

    // Click play
    console.log('4. Clicking Play...');
    await page.click('button[title="Play"]');
    await page.waitForTimeout(1500);

    const samplePlaying = await page.evaluate(() => {
      const cv = document.querySelector('canvas');
      if (!cv) return null;
      const ctx = cv.getContext('2d');
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0 || data[i+3] !== 0) {
          nonZero++;
        }
      }
      return { width: cv.width, height: cv.height, nonZeroPixels: nonZero };
    });
    console.log('Canvas pixel analysis while playing:', samplePlaying);

    const videoState = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? {
        src: v.src ? v.src.substring(0, 30) + '...' : null,
        paused: v.paused,
        currentTime: v.currentTime,
        duration: v.duration,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        readyState: v.readyState
      } : 'No video element';
    });
    console.log('Video element state:', videoState);
  }

  await browser.close();
})();
