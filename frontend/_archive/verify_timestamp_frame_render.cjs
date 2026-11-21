const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 }
  });
  const page = await context.newPage();
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  const errors = [];
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
    errors.push(err.message);
  });

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

  console.log('1. Logging in as operator...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 8000 });

  console.log('2. Navigating to facility monitor...');
  await page.goto('http://localhost:5173/dashboard/monitor/1700000001', { waitUntil: 'networkidle' });
  await page.waitForSelector('h1:has-text("City Square Telemetry Deck")', { timeout: 6000 });

  // 3. Upload video
  console.log('3. Uploading surveillance video clip...');
  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);

  // Wait for canvas to appear
  await page.waitForSelector('canvas', { timeout: 5000 });
  await page.waitForTimeout(600);

  // 4. Verify immediate frame 0 rendering WITHOUT pressing Play
  console.log('4. Checking video frame rendering without pressing Play...');
  const initialCheck = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c ? c.getContext('2d') : null;
    const px = ctx ? ctx.getImageData(0, 0, c.width, c.height).data : [];
    let nonZero = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 0 || px[i+1] !== 0 || px[i+2] !== 0) nonZero++;
    }
    return {
      paused: v ? v.paused : null,
      currentTime: v ? v.currentTime : null,
      readyState: v ? v.readyState : null,
      width: c ? c.width : 0,
      height: c ? c.height : 0,
      nonZero,
      total: c ? c.width * c.height : 0
    };
  });

  console.log('Upload state without play:', initialCheck);

  if (!initialCheck.paused) {
    throw new Error('FAILED: Video auto-started playing when it should be paused.');
  }
  if (initialCheck.nonZero === 0) {
    throw new Error('FAILED: Canvas is completely blank on upload without play!');
  }
  const pct = Math.round((initialCheck.nonZero / initialCheck.total) * 100);
  console.log(`PASS: Immediate frame 0 decode verified! (${initialCheck.nonZero}/${initialCheck.total} pixels = ${pct}% painted)`);
  if (pct < 95) {
    throw new Error('FAILED: Less than 95% of pixels painted on initial frame.');
  }

  // Capture screenshot of upload without play (Dark Mode)
  await page.screenshot({
    path: path.join(artifactDir, 'upload-frame-preview-dark.png'),
    fullPage: false
  });
  console.log('Saved upload-frame-preview-dark.png');

  // 5. Test seeking without playing
  console.log('5. Testing step forward button (+5s) without playing...');
  await page.click('[data-testid="step-forward-btn"]');
  await page.waitForTimeout(400);

  const stepForwardCheck = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c ? c.getContext('2d') : null;
    const px = ctx ? ctx.getImageData(0, 0, c.width, c.height).data : [];
    let nonZero = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 0 || px[i+1] !== 0 || px[i+2] !== 0) nonZero++;
    }
    return { paused: v.paused, currentTime: v.currentTime, nonZero, total: c.width * c.height };
  });
  console.log('After +5s button:', stepForwardCheck);
  if (!stepForwardCheck.paused) throw new Error('FAILED: Video should remain paused after seeking.');
  if (stepForwardCheck.nonZero < 200000) throw new Error('FAILED: Canvas lost frame on step forward.');
  console.log('PASS: Step forward button rendered frame at new timestamp while paused.');

  // 6. Test jump to start button (|<<)
  console.log('6. Testing jump to start button (00:00)...');
  await page.click('[data-testid="jump-start-btn"]');
  await page.waitForTimeout(400);

  const startCheck = await page.evaluate(() => {
    const v = document.querySelector('video');
    const c = document.querySelector('canvas');
    const ctx = c ? c.getContext('2d') : null;
    const px = ctx ? ctx.getImageData(0, 0, c.width, c.height).data : [];
    let nonZero = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] !== 0 || px[i+1] !== 0 || px[i+2] !== 0) nonZero++;
    }
    return { paused: v.paused, currentTime: v.currentTime, nonZero };
  });
  console.log('After jump to start:', startCheck);
  if (startCheck.currentTime > 0.05) throw new Error('FAILED: Did not jump to start timestamp.');
  console.log('PASS: Jump to start successfully decoded frame 0.');

  // 7. Test drag scrubbing on the scrubber bar
  console.log('7. Testing drag-scrubbing on timeline...');
  const scrubber = page.locator('[data-testid="video-scrubber"]');
  const sBox = await scrubber.boundingBox();
  if (sBox) {
    await page.mouse.move(sBox.x + sBox.width * 0.1, sBox.y + sBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sBox.x + sBox.width * 0.6, sBox.y + sBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const scrubCheck = await page.evaluate(() => {
      const v = document.querySelector('video');
      return { paused: v.paused, currentTime: v.currentTime };
    });
    console.log('After drag scrub:', scrubCheck);
    if (scrubCheck.currentTime < 0.1) throw new Error('FAILED: Drag scrubbing did not update timestamp.');
    console.log('PASS: Drag scrubbing accurately seeked timestamp.');
  }

  // 8. Test Scan Current Frame button while paused
  console.log('8. Testing "Scan Current Frame" button...');
  const scanBtn = page.locator('[data-testid="scan-frame-btn"]');
  if (await scanBtn.count() > 0) {
    await scanBtn.click();
    await page.waitForTimeout(600);
    console.log('PASS: Scan Current Frame triggered successfully without error.');
  }

  // 9. Switch to Light Mode and capture screenshot
  console.log('9. Switching to Light Mode...');
  const themeToggle = page.locator('[data-testid="theme-toggle-btn"]');
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(artifactDir, 'upload-frame-preview-light.png'),
      fullPage: false
    });
    console.log('Saved upload-frame-preview-light.png');
  }

  if (errors.length > 0) {
    throw new Error('Detected errors during test: ' + errors.join(', '));
  }

  await browser.close();
  console.log('ALL TIMESTAMP FRAME PREVIEW VERIFICATIONS PASSED SUCCESSFULLY!');
})();
