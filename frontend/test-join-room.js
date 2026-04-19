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
  
  console.log('=== TEST: Join room by code ===\n');
  
  // First, create a room via roomEdit
  console.log('Step 1: Creating room via roomEdit...');
  await page.goto('http://localhost/roomEdit');
  await page.waitForLoadState('networkidle');
  
  const startButton = await page.locator('button:has-text("Старт игры")');
  await Promise.all([
    page.waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 }),
    startButton.click()
  ]);
  
  const roomUrl = page.url();
  const shortId = roomUrl.match(/\/room\/([^/]+)\/lobby/)[1];
  console.log(`✓ Room created with shortId: ${shortId}`);
  
  // Wait for lobby to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Get the room data to see players
  console.log('\nStep 2: Checking room data via API...');
  const roomResponse = await fetch(`http://localhost:8000/api/rooms/${shortId}`);
  const roomData = await roomResponse.json();
  console.log(`Total players: ${roomData.totalPlayers}`);
  console.log(`Current players: ${roomData.currentPlayers}`);
  console.log(`AI players: ${roomData.aiPlayers}`);
  console.log(`Human players: ${roomData.humanPlayers}`);
  
  // Now open a new browser context and join via the join page
  console.log('\nStep 3: Joining room via join page...');
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  
  await page2.goto('http://localhost/join');
  await page2.waitForLoadState('networkidle');
  
  // Enter the room code
  const codeInput = await page2.locator('input').first();
  await codeInput.fill(shortId);
  
  // Click join button
  const joinButton = await page2.locator('button:has-text("Присоединиться")');
  await Promise.all([
    page2.waitForURL(/\/room\/.*\/lobby/, { timeout: 10000 }),
    joinButton.click()
  ]);
  
  console.log(`✓ Joined room: ${page2.url()}`);
  
  // Wait for lobby to load
  await page2.waitForLoadState('networkidle');
  await page2.waitForTimeout(3000);
  
  // Check room data again
  console.log('\nStep 4: Checking room data after joining...');
  const roomResponse2 = await fetch(`http://localhost:8000/api/rooms/${shortId}`);
  const roomData2 = await roomResponse2.json();
  console.log(`Total players: ${roomData2.totalPlayers}`);
  console.log(`Current players: ${roomData2.currentPlayers}`);
  console.log(`AI players: ${roomData2.aiPlayers}`);
  console.log(`Human players: ${roomData2.humanPlayers}`);
  
  // Get players list
  const playersResponse = await fetch(`http://localhost:8000/api/rooms/${shortId}/players`);
  const playersData = await playersResponse.json();
  console.log('\nPlayers in room:');
  playersData.forEach((p, i) => {
    console.log(`  ${i+1}. ${p.nickname} (AI: ${p.isAI})`);
  });
  
  // Take screenshot
  console.log('\n=== Taking screenshot ===');
  await page2.screenshot({ path: 'test-join-room-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-join-room-screenshot.png');
  
  console.log('\n=== Test completed ===');
  await browser.close();
})();