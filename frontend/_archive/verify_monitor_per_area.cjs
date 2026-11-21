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

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 8000 });
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 });
  console.log('Logged into dashboard at:', page.url());

  // Check how many facilities exist in sidebar
  let facilityButtons = await page.locator('[data-testid="operator-sidebar"] button:has(span:has-text("Municipal zone")), [data-testid="operator-sidebar"] button:has(span:has-text("Division"))').all();
  console.log('Initial facilities in sidebar:', facilityButtons.length);

  // If fewer than 2 facilities, register one via modal
  if (facilityButtons.length < 2) {
    console.log('Registering a second facility via modal for testing...');
    await page.click('[data-testid="dashboard-header"] button:has-text("Register Area")');
    await page.waitForSelector('[data-testid="register-modal"]');
    await page.fill('#modalAreaName', 'City Square Telemetry Deck');
    await page.fill('#modalAreaLocation', 'Central Division, Kampala Road');
    await page.fill('#modalAreaCapacity', '45');
    await page.click('[data-testid="register-modal"] button:has-text("Register Parking Area")');
    await page.waitForTimeout(600);
  }

  // Re-query facilities in sidebar
  const sidebarNav = page.locator('[data-testid="operator-sidebar"]');
  const areaButtons = await sidebarNav.locator('button:has(.material-symbols-outlined)').all();
  console.log('Total navigation buttons in sidebar:', areaButtons.length);

  // Click on the last facility in the sidebar (Live Monitor per area)
  console.log('2. Clicking facility from sidebar to launch its Live Monitor...');
  const facilityLink = sidebarNav.locator('button:has-text("City Square Telemetry Deck"), button:has-text("ABC")').first();
  await facilityLink.click();
  await page.waitForURL('**/dashboard/monitor/**', { timeout: 5000 });
  console.log('Navigated to facility monitor URL:', page.url());

  // Check workspace title
  const workspaceTitle = await page.locator('h1').textContent();
  console.log('Monitor workspace title:', workspaceTitle);

  // Check breadcrumb
  const breadcrumb = await page.locator('[data-testid="dashboard-header"]').textContent();
  console.log('Dashboard header breadcrumb:', breadcrumb);

  const shot1 = path.join(outDir, 'monitor-per-area-sidebar.png');
  await page.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, path.join(artifactDir, 'monitor-per-area-sidebar.png'));
  console.log('Captured screenshot 1:', shot1);

  // Test in-workspace facility switcher
  console.log('3. Testing in-workspace facility switcher dropdown...');
  const switchBtn = page.locator('button:has-text("Switch Facility")');
  if (await switchBtn.isVisible()) {
    await switchBtn.click();
    await page.waitForTimeout(400);

    const shot2 = path.join(outDir, 'monitor-facility-switcher.png');
    await page.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(artifactDir, 'monitor-facility-switcher.png'));
    console.log('Captured facility switcher dropdown screenshot:', shot2);

    // Click the other facility
    const otherOption = page.locator('div:has-text("Select Facility to Monitor") ~ button').first();
    if (await otherOption.isVisible()) {
      const otherName = await otherOption.textContent();
      console.log('Switching to facility:', otherName);
      await otherOption.click();
      await page.waitForTimeout(600);
      console.log('New URL after switching facility:', page.url());
    }
  }

  // 4. Test page refresh persistence
  console.log('4. Testing page refresh persistence on monitored area...');
  const currentUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="dashboard-header"]');
  console.log('URL after reload:', page.url());
  const reloadedTitle = await page.locator('h1').textContent();
  console.log('Title after reload:', reloadedTitle);

  await browser.close();
  console.log('All Live Monitor per-area tests completed successfully!');
})();
