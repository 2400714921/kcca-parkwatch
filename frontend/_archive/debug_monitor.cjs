const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    const sampleAreas = [
      {
        id: 101,
        name: "City Square Central",
        location: "Central Division, Kampala Road",
        totalCapacity: 50,
        spots: [{ id: 1, x1: 10, y1: 10, x2: 60, y2: 60 }],
        spotDimensions: { width: 1280, height: 720 },
        analytics: []
      },
      {
        id: 102,
        name: "Oasis Mall Telemetry Deck",
        location: "Nakawa Division, Yusuf Lule Rd",
        totalCapacity: 80,
        spots: [{ id: 1, x1: 20, y1: 20, x2: 70, y2: 70 }],
        spotDimensions: { width: 1280, height: 720 },
        analytics: []
      }
    ];
    localStorage.setItem('parkingAreas', JSON.stringify(sampleAreas));
  });

  const page = await context.newPage();
  const outDir = path.resolve(__dirname);
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(500);

  // In sidebar, click the first facility under Live Monitor Per Area
  console.log('2. Clicking "City Square Central" in sidebar...');
  const citySquareBtn = page.locator('[data-testid="operator-sidebar"] button:has-text("City Square Central")');
  await citySquareBtn.click();
  await page.waitForURL('**/dashboard/monitor/101');
  await page.waitForTimeout(600);

  const h1 = await page.locator('h1').textContent();
  console.log('Monitor page h1:', h1);
  const breadcrumb = await page.locator('[data-testid="dashboard-header"] span.font-bold').first().textContent();
  console.log('Dashboard header breadcrumb:', breadcrumb);

  // Take screenshot of monitor with sidebar showing per-area items
  const shot = path.join(outDir, 'monitor-per-area-sidebar.png');
  await page.screenshot({ path: shot });
  fs.copyFileSync(shot, path.join(artifactDir, 'monitor-per-area-sidebar.png'));
  console.log('Captured screenshot 1:', shot);

  // Test facility switcher dropdown
  console.log('3. Testing facility switcher dropdown...');
  const switchBtn = page.locator('button:has-text("Switch Facility")');
  if (await switchBtn.isVisible()) {
    console.log('Opening facility switcher...');
    await switchBtn.click();
    await page.waitForTimeout(300);
    const shotSwitcher = path.join(outDir, 'monitor-facility-switcher.png');
    await page.screenshot({ path: shotSwitcher });
    fs.copyFileSync(shotSwitcher, path.join(artifactDir, 'monitor-facility-switcher.png'));
    console.log('Captured switcher screenshot:', shotSwitcher);

    // Switch to Oasis Mall
    console.log('Switching to Oasis Mall...');
    await page.click('button:has-text("Oasis Mall Telemetry Deck")');
    await page.waitForURL('**/dashboard/monitor/102');
    await page.waitForTimeout(500);
    const newH1 = await page.locator('h1').textContent();
    console.log('New monitor page h1 after switch:', newH1);
  }

  await browser.close();
  console.log('Test completed successfully!');
})();
