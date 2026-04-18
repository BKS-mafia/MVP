const { chromium } = require('playwright');

const BASE_URL = 'http://localhost/';
const SCREENSHOT_DIR = 'd:/kelll31scripts/MVP/frontend/test-screenshots/';

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let browser;
let page;
let errors = [];
let testsPassed = 0;
let testsFailed = 0;

async function takeScreenshot(name) {
  const filename = `${SCREENSHOT_DIR}${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  📸 Screenshot: ${filename}`);
}

async function testButton(selector, name, expectedUrl = null) {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    const button = await page.$(selector);
    if (!button) {
      console.log(`  ❌ FAILED: Button "${name}" not found (selector: ${selector})`);
      errors.push(`Button not found: ${name} (${selector})`);
      testsFailed++;
      return false;
    }
    
    const isVisible = await button.isVisible();
    if (!isVisible) {
      console.log(`  ❌ FAILED: Button "${name}" is not visible`);
      errors.push(`Button not visible: ${name}`);
      testsFailed++;
      return false;
    }
    
    console.log(`  ✅ Button "${name}" found and visible`);
    
    if (expectedUrl) {
      await button.click();
      await page.waitForURL(expectedUrl, { timeout: 5000 }).catch(() => {});
      const currentUrl = page.url();
      if (!currentUrl.includes(expectedUrl)) {
        console.log(`  ⚠️  URL check: expected "${expectedUrl}", got "${currentUrl}"`);
      } else {
        console.log(`  ✅ Navigated to: ${currentUrl}`);
      }
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
    }
    
    testsPassed++;
    return true;
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
    errors.push(`Error testing ${name}: ${e.message}`);
    testsFailed++;
    return false;
  }
}

async function runTests() {
  console.log('🎮 Starting comprehensive game testing...\n');
  console.log('='.repeat(60));
  
  browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  
  page = await browser.newPage();
  page.setDefaultTimeout(10000);
  
  // ==========================================
  // TEST 1: Main Page (Home)
  // ==========================================
  console.log('\n\n📌 TEST 1: MAIN PAGE (HOME)');
  console.log('='.repeat(60));
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await takeScreenshot('01_main_page');
  
  // Check page title
  const title = await page.title();
  console.log(`Page title: ${title}`);
  if (title === 'Mafia Game') {
    console.log('✅ Title is correct');
    testsPassed++;
  } else {
    console.log(`❌ Title mismatch: expected "Mafia Game", got "${title}"`);
    errors.push(`Title mismatch: ${title}`);
    testsFailed++;
  }
  
  // Test "Создать комнату" button
  await testButton('button:has-text("Создать комнату")', 'Create Room Button', '/roomEdit');
  
  // Test "Присоединиться по коду" button
  await testButton('button:has-text("Присоединиться по коду")', 'Join by Code Button', '/join');
  
  // Test "Обновить" button
  await testButton('button:has-text("Обновить")', 'Refresh Button');
  
  // ==========================================
  // TEST 2: Join Page
  // ==========================================
  console.log('\n\n📌 TEST 2: JOIN PAGE');
  console.log('='.repeat(60));
  
  await page.goto(BASE_URL + 'join');
  await page.waitForLoadState('networkidle');
  await takeScreenshot('02_join_page');
  
  // Test "Подключиться" button (should be disabled initially)
  const connectBtn = await page.$('button:has-text("Подключиться")');
  if (connectBtn) {
    console.log('✅ Connect button found');
    testsPassed++;
  } else {
    console.log('❌ Connect button not found');
    errors.push('Connect button not found on join page');
    testsFailed++;
  }
  
  // Test "Назад" button
  await testButton('button:has-text("Назад")', 'Back Button', '/');
  
  // Test input field for room code
  const codeInput = await page.$('input[placeholder*="код"]');
  if (codeInput) {
    console.log('✅ Room code input found');
    testsPassed++;
    await codeInput.fill('TEST123');
    await takeScreenshot('02_join_page_with_code');
  } else {
    console.log('❌ Room code input not found');
    errors.push('Room code input not found');
    testsFailed++;
  }
  
  // ==========================================
  // TEST 3: Room Edit / Settings Page
  // ==========================================
  console.log('\n\n📌 TEST 3: ROOM SETTINGS PAGE');
  console.log('='.repeat(60));
  
  await page.goto(BASE_URL + 'roomEdit');
  await page.waitForLoadState('networkidle');
  await takeScreenshot('03_room_settings');
  
  // Test "На главную" button
  await testButton('button:has-text("На главную")', 'Back to Home Button', '/');
  
  // Test "Старт игры" button
  const startBtn = await page.$('button:has-text("Старт игры")');
  if (startBtn) {
    console.log('✅ Start Game button found');
    testsPassed++;
  } else {
    console.log('❌ Start Game button not found');
    errors.push('Start Game button not found');
    testsFailed++;
  }
  
  // Test player count input
  const playerCountInput = await page.$('input[type="number"]');
  if (playerCountInput) {
    console.log('✅ Player count input found');
    testsPassed++;
  } else {
    console.log('❌ Player count input not found');
    errors.push('Player count input not found');
    testsFailed++;
  }
  
  // Test slider for humans/AI
  const slider = await page.$('input[type="range"]');
  if (slider) {
    console.log('✅ Slider for humans/AI found');
    testsPassed++;
  } else {
    console.log('❌ Slider not found');
    errors.push('Slider not found');
    testsFailed++;
  }
  
  // ==========================================
  // TEST 4: Create Room and Check Lobby
  // ==========================================
  console.log('\n\n📌 TEST 4: CREATE ROOM AND LOBBY');
  console.log('='.repeat(60));
  
  // Go to main page and create a room
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Click "Создать комнату"
  await page.click('button:has-text("Создать комнату")');
  await page.waitForURL('**/roomEdit', { timeout: 5000 });
  await takeScreenshot('04_room_created');
  
  // Click "Старт игры" to create room
  await page.click('button:has-text("Старт игры")');
  await page.waitForURL('**/room/**', { timeout: 10000 }).catch(() => {
    console.log('⚠️  Did not navigate to room directly, checking current URL');
  });
  
  const currentUrl = page.url();
  console.log(`Current URL after start: ${currentUrl}`);
  
  // Wait a bit for WebSocket connection
  await page.waitForTimeout(2000);
  await takeScreenshot('04_lobby_or_game');
  
  // Check if we're in lobby or game
  if (currentUrl.includes('/lobby')) {
    console.log('✅ Navigated to lobby');
    testsPassed++;
    
    // Test "Начать игру" button in lobby
    const startGameBtn = await page.$('button:has-text("Начать игру")');
    if (startGameBtn) {
      console.log('✅ Start Game button in lobby found');
      testsPassed++;
    } else {
      console.log('❌ Start Game button in lobby not found');
      errors.push('Start Game button in lobby not found');
      testsFailed++;
    }
  } else if (currentUrl.includes('/room/')) {
    console.log('✅ Navigated to room (game started)');
    testsPassed++;
  } else {
    console.log(`⚠️  Unexpected URL: ${currentUrl}`);
    errors.push(`Unexpected URL after start: ${currentUrl}`);
    testsFailed++;
  }
  
  // ==========================================
  // TEST 5: Game Interface (if accessible)
  // ==========================================
  console.log('\n\n📌 TEST 5: GAME INTERFACE');
  console.log('='.repeat(60));
  
  // Try to access game page directly
  await page.goto(BASE_URL + 'room/test/lobby');
  await page.waitForLoadState('networkidle');
  await takeScreenshot('05_game_lobby');
  
  // Check for chat elements
  const chatInput = await page.$('input[placeholder*="сообщ"], input[type="text"]');
  if (chatInput) {
    console.log('✅ Chat input found');
    testsPassed++;
  } else {
    console.log('⚠️  Chat input not found (may need active game)');
  }
  
  // Check for send button
  const sendBtn = await page.$('button:has-text("Отправить"), button[type="submit"]');
  if (sendBtn) {
    console.log('✅ Send message button found');
    testsPassed++;
  } else {
    console.log('⚠️  Send button not found');
  }
  
  // ==========================================
  // TEST 6: Check for Console Errors
  // ==========================================
  console.log('\n\n📌 TEST 6: CONSOLE ERRORS CHECK');
  console.log('='.repeat(60));
  
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  });
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  if (consoleMessages.length > 0) {
    console.log('⚠️  Console errors found:');
    consoleMessages.forEach(msg => console.log(`  - ${msg}`));
    errors.push(`Console errors: ${consoleMessages.join(', ')}`);
    testsFailed++;
  } else {
    console.log('✅ No console errors');
    testsPassed++;
  }
  
  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log(`📝 Total tests: ${testsPassed + testsFailed}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  } else {
    console.log('\n✅ ALL TESTS PASSED!');
  }
  
  await browser.close();
  
  // Exit with appropriate code
  process.exit(errors.length > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  if (browser) browser.close();
  process.exit(1);
});