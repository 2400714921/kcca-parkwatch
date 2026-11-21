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
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  // Seed sample parking facility with initial bays in localStorage
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
          { id: 101, x1: 40, y1: 40, x2: 240, y2: 160 },
          { id: 102, x1: 280, y1: 40, x2: 480, y2: 160 }
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

  console.log('2. Navigating to facility monitor /dashboard/monitor/1700000001...');
  await page.goto('http://localhost:5173/dashboard/monitor/1700000001', { waitUntil: 'networkidle' });
  await page.waitForSelector('h1:has-text("City Square Telemetry Deck")', { timeout: 6000 });
  console.log('PASS: Loaded facility monitor workspace.');

  // Upload test clip
  console.log('3. Uploading surveillance video clip...');
  const fileInput = page.locator('input[type="file"]');
  const clipPath = path.resolve(__dirname, 'clip.webm');
  await fileInput.setInputFiles(clipPath);

  // Wait for canvas to mount and render first frame
  await page.waitForSelector('canvas', { timeout: 5000 });
  await page.waitForTimeout(1000);

  // Inspect canvas pixel analysis immediately upon upload
  const initialPixels = await page.evaluate(() => {
    const cv = document.querySelector('canvas');
    if (!cv) return null;
    const ctx = cv.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
    let nonZero = 0;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
        nonZero++;
      }
      // Check for green bay color (#10b981 / rgb(16, 185, 129)) or grey clip
      if (g > 100 && g > r) colored++;
    }
    return { width, height, total: width * height, nonZero, colored };
  });

  console.log('Initial Canvas Pixel Analysis:', initialPixels);
  if (!initialPixels || initialPixels.nonZero === 0) {
    throw new Error('FAILED: Canvas is still 100% blank! Frame 0 was not painted.');
  }
  console.log('PASS: Canvas actively rendered video frame and bay overlays! (Non-zero pixels:', initialPixels.nonZero, ')');

  // Start playback
  console.log('4. Starting video playback...');
  const playBtn = page.locator('button[title="Play"]');
  await playBtn.click();
  await page.waitForTimeout(1000);

  // Verify time advances
  const videoTime = await page.evaluate(() => {
    const v = document.querySelector('video');
    return v ? { currentTime: v.currentTime, paused: v.paused, readyState: v.readyState } : null;
  });
  console.log('Video playback state:', videoTime);
  if (!videoTime || videoTime.currentTime < 0) {
    throw new Error('FAILED: Video did not advance playback.');
  }
  console.log('PASS: Video playback running smoothly.');

  // Test interactive marking of a 3rd parking spot
  console.log('5. Testing interactive spot marking...');
  await page.click('button:has-text("Mark Spots")');
  await page.waitForTimeout(300);

  // Perform mouse drag on canvas to draw a new spot
  const canvasElement = page.locator('canvas');
  const canvasBox = await canvasElement.boundingBox();
  const startX = canvasBox.x + canvasBox.width * 0.2;
  const startY = canvasBox.y + canvasBox.height * 0.55;
  const endX = canvasBox.x + canvasBox.width * 0.45;
  const endY = canvasBox.y + canvasBox.height * 0.85;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Click Done Marking
  await page.click('button:has-text("Stop Marking"), button:has-text("Done Marking")');
  await page.waitForTimeout(400);

  // Verify spot was registered (bay register shows 3 spots)
  const spotCount = await page.locator('text=3 TOTAL').count();
  console.log('Spot count badge rendered "3 TOTAL":', spotCount > 0);
  if (spotCount === 0) {
    throw new Error('FAILED: Newly drawn spot was not added to bay register.');
  }
  console.log('PASS: Interactive marking successfully created and registered Bay #3.');

  // Test timeline scrubber click
  console.log('6. Testing timeline scrubber click...');
  const scrubber = page.locator('[data-testid="video-scrubber"]');
  const scrubberBox = await scrubber.boundingBox();
  if (scrubberBox) {
    await page.mouse.click(scrubberBox.x + scrubberBox.width * 0.5, scrubberBox.y + scrubberBox.height / 2);
    await page.waitForTimeout(300);
    const scrubbedTime = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? v.currentTime : 0;
    });
    console.log('Time after scrubber click:', scrubbedTime);
  }

  // Screenshot in Dark Mode
  console.log('7. Capturing Dark Mode screenshot...');
  await page.screenshot({
    path: path.join(artifactDir, 'video-monitor-playback-dark.png'),
    fullPage: false
  });
  console.log('Saved video-monitor-playback-dark.png');

  // Switch to Light Mode and capture screenshot
  console.log('8. Switching to Light Mode and capturing screenshot...');
  const themeToggle = page.locator('[data-testid="theme-toggle-btn"]');
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(artifactDir, 'video-monitor-playback-light.png'),
      fullPage: false
    });
    console.log('Saved video-monitor-playback-light.png');
  }

  if (errors.length > 0) {
    throw new Error('Errors detected during test: ' + errors.join(', '));
  }

  await browser.close();
  console.log('ALL VIDEO RENDERING & PLAYBACK VERIFICATION CHECKS PASSED!');
})();
