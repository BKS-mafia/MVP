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
  console.log('=== TEST: AI Players in Lobby ===\n');
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
    
    // Wait for WebSocket and data to load
    console.log('\n=== Waiting for players to load ===');
    await page.waitForTimeout(3000);
    
    // Check for player elements in the lobby
    console.log('\n=== Checking for players in lobby ===');
    
    // Look for player cards/elements
    // Common selectors for player lists in Mafia games
    const playerSelectors = [
      '.player-card',
      '.player-item',
      '.ant-card',
      '.player-avatar',
      '[class*="player"]',
      '.lobby-player'
    ];
    
    let playersFound = false;
    for (const selector of playerSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        playersFound = true;
      }
    }
    
    // Check for any text that might indicate players
    const pageContent = await page.content();
    
    // Look for common player-related text
    const playerTexts = ['Игрок', 'Player', 'Участник', 'Мирный', 'Мафия', 'Доктор', 'Комиссар'];
    console.log('\n=== Looking for player-related text ===');
    for (const text of playerTexts) {
      const element = await page.locator(`text=${text}`).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`✓ Found text: "${text}"`);
      }
    }
    
    // Check for AI indicator
    const aiIndicator = await page.locator('text=AI').first();
    if (await aiIndicator.isVisible().catch(() => false)) {
      console.log('✓ Found AI indicator');
    }
    
    // Check for player count
    const playerCountPatterns = [
      /\d+\s*\/\s*\d+/,  // e.g., "3/8"
      /\d+\s*игрок/,
      /players.*\d+/
    ];
    
    console.log('\n=== Checking player count ===');
    const bodyText = await page.locator('body').textContent();
    for (const pattern of playerCountPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        console.log(`✓ Found player count: ${match[0]}`);
      }
    }
    
    // Check console for player data
    console.log('\n=== Console messages (player-related) ===');
    const playerMessages = consoleMessages.filter(m => 
      m.text.toLowerCase().includes('player') ||
      m.text.toLowerCase().includes('игрок') ||
      m.text.toLowerCase().includes('room') ||
      m.text.includes('currentPlayers') ||
      m.text.includes('aiPlayers')
    );
    
    if (playerMessages.length > 0) {
      playerMessages.slice(-15).forEach(m => {
        console.log(`[${m.type}] ${m.text.substring(0, 200)}`);
      });
    } else {
      console.log('No player-related console messages found');
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
  await page.screenshot({ path: 'test-ai-players-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-ai-players-screenshot.png');
  
  console.log('\n=== Test completed ===');
  await browser.close();
})();