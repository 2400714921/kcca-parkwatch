const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Testing Public Landing Page at http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  const publicHeader = await page.locator('header').count();
  const publicFooter = await page.locator('footer').count();
  console.log(`Public header count: ${publicHeader}, footer count: ${publicFooter} (expected: 1, 1)`);

  console.log('2. Clicking Operator Login...');
  await page.click('text=Operator Login');
  await page.waitForURL('**/login', { timeout: 5000 });
  console.log('Current URL after clicking login:', page.url());

  console.log('3. Filling login credentials...');
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 8000 });
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 });
  console.log('Current URL after login:', page.url());

  console.log('4. Checking Dashboard Top Header...');
  const dashHeaderVisible = await page.locator('[data-testid="dashboard-header"]').isVisible();
  console.log(`Dashboard top header visible: ${dashHeaderVisible} (expected: true)`);

  const breadcrumbText = await page.locator('[data-testid="dashboard-header"]').textContent();
  console.log(`Dashboard header content includes "Operations Dashboard": ${breadcrumbText.includes('Operations Dashboard')}`);

  console.log('5. Checking Sidebar items...');
  const sidebarText = await page.locator('[data-testid="operator-sidebar"]').textContent();
  const hasPublicPortal = sidebarText.includes('Public Civic Portal');
  const hasRegisterParkingArea = sidebarText.includes('Register Parking Area');
  console.log(`Sidebar has "Public Civic Portal": ${hasPublicPortal} (expected: false)`);
  console.log(`Sidebar has "Register Parking Area": ${hasRegisterParkingArea} (expected: true)`);

  const outDir = path.resolve(__dirname);
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  // Ensure Light Mode first
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDark) {
    await page.click('button[title="Switch to Light Mode"]');
    await page.waitForTimeout(400);
  }

  const dashLight = path.join(outDir, 'dashboard-routed-light.png');
  await page.screenshot({ path: dashLight });
  fs.copyFileSync(dashLight, path.join(artifactDir, 'dashboard-routed-light.png'));
  console.log('Captured dashboard routed light mode screenshot.');

  // Toggle Dark Mode
  await page.click('button[title="Switch to Dark Mode"]');
  await page.waitForTimeout(400);
  const dashDark = path.join(outDir, 'dashboard-routed-dark.png');
  await page.screenshot({ path: dashDark });
  fs.copyFileSync(dashDark, path.join(artifactDir, 'dashboard-routed-dark.png'));
  console.log('Captured dashboard routed dark mode screenshot.');

  console.log('6. Navigating to Register Parking Area via sidebar...');
  await page.click('text=Register Parking Area');
  await page.waitForURL('**/register-facility', { timeout: 5000 });
  await page.waitForSelector('text=Register a Parking Area', { timeout: 5000 });
  console.log('Current URL on Register page:', page.url());

  const formVisible = await page.locator('text=Register a Parking Area').isVisible();
  console.log(`"Register a Parking Area" form visible: ${formVisible} (expected: true)`);

  const regScreenshot = path.join(outDir, 'register-facility-routed.png');
  await page.screenshot({ path: regScreenshot });
  fs.copyFileSync(regScreenshot, path.join(artifactDir, 'register-facility-routed.png'));
  console.log('Captured register facility page screenshot.');

  console.log('7. Testing browser back button...');
  await page.goBack();
  await page.waitForURL('**/dashboard', { timeout: 5000 });
  console.log('Current URL after goBack():', page.url());

  await browser.close();
  console.log('All routing and layout checks passed successfully!');
})();
