const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/login');
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(500);

  const loc = page.locator('[data-testid="dashboard-header"]');
  const box = await loc.boundingBox();
  console.log('Dashboard header bounding box:', box);
  const isVis = await loc.isVisible();
  console.log('isVisible:', isVis);
  const text = await loc.textContent();
  console.log('Text content:', text);

  const h1 = await page.locator('h1').allTextContents();
  console.log('All h1:', h1);

  await page.goto('http://localhost:5173/dashboard/register-facility');
  await page.waitForTimeout(500);
  const h1Reg = await page.locator('h1').allTextContents();
  console.log('All h1 on register page:', h1Reg);

  await browser.close();
})();
