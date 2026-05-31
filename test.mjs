import { chromium } from 'playwright';

(async () => {
  console.log('Starting SQA test...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  try {
    await page.goto('http://localhost:3001/');
    await page.waitForTimeout(1000);
    
    // Login if needed
    if (await page.locator('#login-username').isVisible()) {
      await page.fill('#login-username', 'admin');
      await page.fill('#login-password', 'admin123');
      await page.click('#btn-login');
      await page.waitForTimeout(1000);
    }
    
    // Click all sidebar links
    const links = await page.locator('.sidebar-nav-item').all();
    for (let i = 0; i < links.length; i++) {
      await links[i].click();
      await page.waitForTimeout(500);
    }
    
    // Go to Rentals and try filter dropdown
    await page.locator('.sidebar-nav-item[href="#/rentals"]').click();
    await page.waitForTimeout(500);
    if (await page.locator('#rental-status-dropdown').isVisible()) {
      await page.selectOption('#rental-status-dropdown', 'active');
      await page.waitForTimeout(500);
    }
    
    // Go to Settings and try saving
    await page.locator('.sidebar-nav-item[href="#/settings"]').click();
    await page.waitForTimeout(500);
    if (await page.locator('button[type="submit"]').isVisible()) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    // Go to POS and try clicking things
    await page.locator('.sidebar-nav-item[href="#/pos"]').click();
    await page.waitForTimeout(500);
    
  } catch (e) {
    console.error('Test Execution Error:', e);
  } finally {
    console.log('--- SQA TEST RESULTS ---');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} errors:`);
      errors.forEach(e => console.log(e));
    } else {
      console.log('No errors found during automated flow.');
    }
    await browser.close();
  }
})();
