const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost/...');
  await page.goto('http://localhost/');
  
  console.log('Page title:', await page.title());
  
  // Get page content
  const content = await page.content();
  console.log('Page loaded, content length:', content.length);
  
  // Take screenshot
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('Screenshot saved to test-screenshot.png');
  
  await browser.close();
  console.log('Browser closed');
})();