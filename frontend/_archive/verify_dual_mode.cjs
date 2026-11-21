const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Light Mode
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('kcca_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: '_archive/verified-light-mode.png', fullPage: true });
  console.log('Saved verified-light-mode.png');

  // 2. Click Theme Toggle to switch to Dark Mode
  const themeToggle = await page.$('button[aria-label="Toggle theme"]');
  if (themeToggle) {
    await themeToggle.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: '_archive/verified-dark-mode.png', fullPage: true });
  console.log('Saved verified-dark-mode.png');

  await browser.close();
})();
