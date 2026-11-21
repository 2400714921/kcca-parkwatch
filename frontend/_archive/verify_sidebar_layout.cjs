const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to public landing page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Verify landing page has header
  const landingHeaderCount = await page.locator('header').count();
  console.log(`Landing page <header> count: ${landingHeaderCount} (expected: 1)`);

  // Navigate to login
  console.log('2. Navigating to login...');
  await page.click('text=Operator Login');
  await page.waitForTimeout(500);

  // Fill credentials
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');

  console.log('3. Waiting for dashboard...');
  await page.waitForSelector('[data-testid="operator-sidebar"]', { timeout: 10000 });
  await page.waitForTimeout(800);

  // Verify dashboard has NO <header> element!
  const dashboardHeaderCount = await page.locator('header').count();
  console.log(`Dashboard <header> count: ${dashboardHeaderCount} (expected: 0)`);

  // Verify sidebar is present
  const sidebarExists = await page.locator('[data-testid="operator-sidebar"]').isVisible();
  console.log(`Sidebar visible: ${sidebarExists} (expected: true)`);

  // Ensure Light Mode first
  const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDarkInitial) {
    await page.click('button[title="Switch to Light Mode"]');
    await page.waitForTimeout(400);
  }

  const outDir = path.resolve(__dirname);
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  const lightPath = path.join(outDir, 'sidebar-dashboard-light.png');
  await page.screenshot({ path: lightPath });
  console.log('Captured light mode screenshot to:', lightPath);
  fs.copyFileSync(lightPath, path.join(artifactDir, 'sidebar-dashboard-light.png'));

  // Toggle to Dark Mode
  console.log('4. Toggling to Dark Mode...');
  await page.click('button[title="Switch to Dark Mode"]');
  await page.waitForTimeout(500);

  const darkPath = path.join(outDir, 'sidebar-dashboard-dark.png');
  await page.screenshot({ path: darkPath });
  console.log('Captured dark mode screenshot to:', darkPath);
  fs.copyFileSync(darkPath, path.join(artifactDir, 'sidebar-dashboard-dark.png'));

  // Test navigation to Create Area inside sidebar
  console.log('5. Clicking Register Facility in sidebar...');
  await page.click('text=Register Facility');
  await page.waitForTimeout(500);
  const createAreaVisible = await page.locator('text=Register a Parking Facility').isVisible();
  console.log(`Create area form visible: ${createAreaVisible} (expected: true)`);

  // Dashboard header count still 0
  const createAreaHeaderCount = await page.locator('header').count();
  console.log(`Create Area <header> count: ${createAreaHeaderCount} (expected: 0)`);

  await browser.close();
  console.log('Verification finished successfully!');
})();
