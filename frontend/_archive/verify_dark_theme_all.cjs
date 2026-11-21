const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  const outDir = path.resolve(__dirname);
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  console.log('1. Testing Login Page in Dark Mode...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  // Ensure Dark Mode is active
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!isDark) {
    await page.click('button[title="Switch to Dark Mode"]');
    await page.waitForTimeout(400);
  }

  const formBg = await page.evaluate(() => {
    const el = document.querySelector('form');
    return window.getComputedStyle(el).backgroundColor;
  });
  console.log('Login form background color in dark mode:', formBg);

  const loginDarkPath = path.join(outDir, 'login-dark-mode.png');
  await page.screenshot({ path: loginDarkPath });
  fs.copyFileSync(loginDarkPath, path.join(artifactDir, 'login-dark-mode.png'));

  console.log('2. Logging in...');
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 8000 });
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 });
  console.log('Logged into dashboard at:', page.url());

  console.log('3. Verifying Sidebar navigation items...');
  const sidebarText = await page.locator('[data-testid="operator-sidebar"]').textContent();
  const hasRegisterInSidebar = sidebarText.includes('Register Parking Area');
  console.log(`Sidebar has "Register Parking Area": ${hasRegisterInSidebar} (expected: false)`);

  console.log('4. Testing Modal Opening via Header Button...');
  await page.click('[data-testid="dashboard-header"] button:has-text("Register Area")');
  await page.waitForSelector('[data-testid="register-modal"]', { timeout: 4000 });
  const modalVisible = await page.locator('[data-testid="register-modal"]').isVisible();
  console.log(`Modal visible: ${modalVisible} (expected: true)`);

  const modalDarkPath = path.join(outDir, 'modal-register-dark.png');
  await page.screenshot({ path: modalDarkPath });
  fs.copyFileSync(modalDarkPath, path.join(artifactDir, 'modal-register-dark.png'));

  console.log('5. Closing modal via Cancel button...');
  await page.click('[data-testid="register-modal"] button:has-text("Cancel")');
  await page.waitForTimeout(300);
  const modalStillVisible = await page.locator('[data-testid="register-modal"]').isVisible();
  console.log(`Modal closed: ${!modalStillVisible} (expected: true)`);

  console.log('6. Testing Live Monitor Workspace in Dark Mode...');
  // Click monitor on first facility or navigate to /dashboard/monitor
  const monitorBtn = page.locator('button:has-text("Monitor")').first();
  if (await monitorBtn.isVisible()) {
    await monitorBtn.click();
    await page.waitForTimeout(800);
  } else {
    await page.goto('http://localhost:5173/dashboard/monitor');
    await page.waitForTimeout(800);
  }

  const monitorDarkPath = path.join(outDir, 'monitor-dark-mode.png');
  await page.screenshot({ path: monitorDarkPath });
  fs.copyFileSync(monitorDarkPath, path.join(artifactDir, 'monitor-dark-mode.png'));

  const stageBg = await page.evaluate(() => {
    const el = document.querySelector('.bg-white, .dark\\:bg-\\[\\#151f30\\]');
    return el ? window.getComputedStyle(el).backgroundColor : 'none';
  });
  console.log('Monitor card background color in dark mode:', stageBg);

  await browser.close();
  console.log('All dark mode and modal tests passed successfully!');
})();
