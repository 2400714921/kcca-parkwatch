const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  const artifactDir = 'C:\\Users\\Anthony.kimbugwe\\.gemini\\antigravity-cli\\brain\\6799a5af-b3ed-47f5-b23a-d9172159a70f';

  // Seed theme and sample areas in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('kcca_theme', 'dark');
    const existing = localStorage.getItem('parkingAreas');
    if (!existing || existing === '[]') {
      localStorage.setItem('parkingAreas', JSON.stringify([
        {
          id: 1700000001,
          name: 'City Square Telemetry Deck',
          location: 'Central Division, Kampala Road',
          totalCapacity: 50,
          createdAt: new Date().toISOString(),
          spots: [],
          spotDimensions: null,
          analytics: []
        }
      ]));
    }
  });

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#username', 'operator');
  await page.fill('#password', 'operator123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 8000 });
  await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 });
  console.log('Logged into dashboard at:', page.url());

  // Check header text: ensure NO "KCCA Central Operations" and NO "Register Area" / "Register Parking"
  const header = page.locator('[data-testid="dashboard-header"]');
  const headerText = await header.innerText();
  console.log('Header visible text:\n', headerText);

  if (headerText.includes('KCCA Central Operations')) {
    throw new Error('FAILED: Header still contains "KCCA Central Operations"');
  }
  if (headerText.includes('Register Area') || headerText.includes('Register Parking')) {
    throw new Error('FAILED: Header still contains register button');
  }
  console.log('PASS: Header does not contain "KCCA Central Operations" nor register buttons.');

  // Check Profile Menu button exists
  const profileMenuBtn = page.locator('[data-testid="profile-menu-button"]');
  await profileMenuBtn.waitFor({ state: 'visible' });
  console.log('PASS: Profile avatar menu button is visible.');

  // Click Profile Menu button to open dropdown
  console.log('2. Opening Profile Dropdown Menu...');
  await profileMenuBtn.click();
  const dropdownMenu = page.locator('[data-testid="profile-dropdown-menu"]');
  await dropdownMenu.waitFor({ state: 'visible', timeout: 3000 });
  console.log('PASS: Profile dropdown menu opened.');

  // Capture screenshot of profile dropdown (Dark mode)
  await page.screenshot({
    path: path.join(artifactDir, 'header-profile-dropdown-dark.png'),
    fullPage: false
  });
  console.log('Saved header-profile-dropdown-dark.png');

  // Verify Update Profile and Sign Out buttons inside dropdown
  const updateProfileBtn = page.locator('[data-testid="update-profile-btn"]');
  const signOutBtn = page.locator('[data-testid="profile-logout-btn"]');
  await updateProfileBtn.waitFor({ state: 'visible' });
  await signOutBtn.waitFor({ state: 'visible' });
  console.log('PASS: "Update Profile" and "Sign Out" actions present in dropdown.');

  // Click "Update Profile"
  console.log('3. Clicking Update Profile to open modal...');
  await updateProfileBtn.click();
  const profileModal = page.locator('[data-testid="update-profile-modal"]');
  await profileModal.waitFor({ state: 'visible', timeout: 3000 });
  console.log('PASS: Update Profile Modal is open.');

  // Fill in profile updates
  await page.fill('#profileDisplayName', 'Anthony Lead Operator');
  await page.fill('#profileEmail', 'anthony.lead@kcca.go.ug');
  await page.fill('#profilePhone', '+256 700 889900');

  // Screenshot the Update Profile modal (Dark mode)
  await page.screenshot({
    path: path.join(artifactDir, 'update-profile-modal-dark.png'),
    fullPage: false
  });
  console.log('Saved update-profile-modal-dark.png');

  // Submit profile update
  console.log('4. Submitting profile updates...');
  await page.click('[data-testid="save-profile-btn"]');

  // Wait for success feedback message
  const successNotice = page.locator('text=Profile updated successfully');
  await successNotice.waitFor({ state: 'visible', timeout: 5000 });
  console.log('PASS: Received confirmation "Profile updated successfully".');

  // Close the modal
  await page.click('[data-testid="close-profile-modal-btn"]');
  await profileModal.waitFor({ state: 'hidden', timeout: 3000 });
  console.log('PASS: Update Profile modal closed cleanly.');

  // Test Light mode rendering
  console.log('5. Switching to light mode and capturing clean header...');
  // Click theme toggle button in sidebar
  await page.click('[data-testid="theme-toggle-btn"]');
  await page.waitForTimeout(400);

  // Take screenshot of clean header in light mode
  await page.screenshot({
    path: path.join(artifactDir, 'clean-header-light.png'),
    fullPage: false
  });
  console.log('Saved clean-header-light.png');

  // Open profile dropdown in light mode
  await profileMenuBtn.click();
  await dropdownMenu.waitFor({ state: 'visible', timeout: 3000 });
  await page.screenshot({
    path: path.join(artifactDir, 'header-profile-dropdown-light.png'),
    fullPage: false
  });
  console.log('Saved header-profile-dropdown-light.png');

  // Test Sign Out from profile dropdown
  console.log('6. Clicking Sign Out from profile menu...');
  await signOutBtn.click();
  await page.waitForURL('**/login', { timeout: 6000 });
  console.log('PASS: Successfully logged out and redirected to:', page.url());

  // Verify token is removed from localStorage
  const tokenInStorage = await page.evaluate(() => localStorage.getItem('parkwatch_token'));
  if (tokenInStorage) {
    throw new Error('FAILED: parkwatch_token still in localStorage after logout');
  }
  console.log('PASS: Session token cleared from localStorage.');

  await browser.close();
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
})();
