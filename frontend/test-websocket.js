const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  
  // Navigate to roomEdit page
  console.log('Navigating to http://localhost/roomEdit...');
  await page.goto('http://localhost/roomEdit');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  console.log('Page title:', await page.title());
  
  // Click "Старт игры" button
  console.log('\n=== Creating room ===');
  const startButton = await page.locator('button:has-text("Старт игры")');
  
  if (await startButton.isVisible() && !(await startButton.isDisabled())) {
    console.log('Clicking "Старт игры" button...');
    
    // Navigate to room after clicking
    await Promise.all([
      page.waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 }),
      startButton.click()
    ]);
    
    console.log('✓ Navigated to:', page.url());
    
    // Wait for lobby page to load
    await page.waitForLoadState('networkidle');
    console.log('✓ Lobby page loaded');
    
    // Wait a bit for WebSocket to connect
    console.log('\n=== Waiting for WebSocket connection ===');
    await page.waitForTimeout(3000);
    
    // Check console messages for WebSocket status
    console.log('\n=== Console messages (last 20) ===');
    const wsMessages = consoleMessages.filter(m => 
      m.text.includes('WebSocket') || 
      m.text.includes('ws://') ||
      m.text.includes('connecting') ||
      m.text.includes('connected') ||
      m.text.includes('error') ||
      m.text.includes('disconnected')
    );
    
    if (wsMessages.length > 0) {
      wsMessages.slice(-20).forEach(m => {
        console.log(`[${m.type}] ${m.text}`);
      });
    } else {
      console.log('No WebSocket messages found in console');
    }
    
    // Check if there are any errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(e => console.log(`ERROR: ${e.text}`));
    } else {
      console.log('\n✓ No console errors detected');
    }
    
    // Check if we're on the lobby page
    const currentUrl = page.url();
    if (currentUrl.includes('/lobby')) {
      console.log('\n✓ Successfully created room and joined lobby!');
      console.log(`  Room URL: ${currentUrl}`);
    }
  } else {
    console.log('✗ Start button is disabled or not visible');
  }
  
  // Take screenshot
  console.log('\n=== Taking screenshot ===');
  await page.screenshot({ path: 'test-websocket-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-websocket-screenshot.png');
  
  console.log('\n=== Test completed ===');
  await browser.close();
})();