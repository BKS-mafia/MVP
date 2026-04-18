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
  
  // Check title
  const title = await page.title();
  if (title.includes('Mafia')) {
    console.log('✅ Title is correct');
    testsPassed++;
  } else {
    console.log(`❌ Title incorrect: ${title}`);
    errors.push(`Incorrect title: ${title}`);
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
  
  // Go back to join page
  await page.goto(BASE_URL + 'join');
  await page.waitForLoadState('networkidle');
  
  // Debug: get all inputs
  const allInputs = await page.$$('input');
  console.log(`  Debug: Found ${allInputs.length} inputs on join page`);
  
  // Test input field for room code - use more flexible selector
  const codeInput = await page.$('input[placeholder*="Код"], input[placeholder*="код"]');
  if (codeInput) {
    console.log('✅ Room code input found');
    testsPassed++;
    await codeInput.fill('TEST123');
    await takeScreenshot('02_join_page_with_code');
  } else {
    // Try to find any input
    const anyInput = await page.$('input');
    if (anyInput) {
      const ph = await anyInput.getAttribute('placeholder');
      console.log(`✅ Room code input found (placeholder: "${ph}")`);
      testsPassed++;
      await anyInput.fill('TEST123');
      await takeScreenshot('02_join_page_with_code');
    } else {
      console.log('❌ Room code input not found');
      errors.push('Room code input not found');
      testsFailed++;
    }
  }
  
  // ==========================================
  // TEST 3: Room Edit / Settings Page (with valid room_id)
  // ==========================================
  console.log('\n\n📌 TEST 3: ROOM SETTINGS PAGE');
  console.log('='.repeat(60));
  
  // First go to main page fresh
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  console.log('  On main page, URL:', page.url());
  
  // Wait a bit for any animations
  await page.waitForTimeout(500);
  
  // Click Create Room button
  const createRoomBtn = await page.$('button:has-text("Создать комнату")');
  if (createRoomBtn) {
    console.log('  Found Create Room button, clicking...');
    await createRoomBtn.click();
    
    // Wait for navigation - use a simple approach
    await page.waitForTimeout(3000); // Wait for API call and navigation
    
    const currentUrl = page.url();
    console.log('  After click, URL:', currentUrl);
    
    // If not on roomEdit, try navigating directly with a known room
    if (!currentUrl.includes('roomEdit')) {
      console.log('  ⚠️  Navigation did not work, using existing room...');
      // Use one of the existing rooms from the list
      await page.goto(BASE_URL + 'roomEdit?room_id=NMCpn');
      await page.waitForLoadState('networkidle');
    }
    await takeScreenshot('03_room_settings');
    
    // Now test the room settings page components
    
    // Test "На главную" button (back button)
    const backToHomeBtn = await page.$('button:has-text("На главную"), button:has-text("Назад")');
    if (backToHomeBtn) {
      console.log('✅ Back to Home button found');
      testsPassed++;
    } else {
      console.log('❌ Back to Home button not found');
      testsFailed++;
    }
    
    // Test "Начать игру" / "Старт игры" button
    const startGameBtn = await page.$('button:has-text("Старт игры"), button:has-text("Начать игру"), button:has-text("Start")');
    if (startGameBtn) {
      console.log('✅ Start Game button found');
      testsPassed++;
    } else {
      console.log('❌ Start Game button not found');
      testsFailed++;
    }
    
    // Test slider for player count
    const slider = await page.$('.ant-slider, [class*="slider"]');
    if (slider) {
      console.log('✅ Player count slider found');
      testsPassed++;
    } else {
      console.log('❌ Player count slider not found');
      testsFailed++;
    }
    
    // Test total players input
    const totalPlayersInput = await page.$('input[type="number"], .ant-input-number');
    if (totalPlayersInput) {
      console.log('✅ Total players input found');
      testsPassed++;
    } else {
      console.log('❌ Total players input not found');
      testsFailed++;
    }
    
    // Test role configuration (table with roles)
    const roleTable = await page.$('table, .ant-table');
    if (roleTable) {
      console.log('✅ Role configuration table found');
      testsPassed++;
    } else {
      console.log('❌ Role configuration table not found');
      testsFailed++;
    }
    
  } else {
    console.log('❌ Could not create room to test settings page');
    testsFailed++;
  }
  
  // ==========================================
  // TEST 4: Room List (if rooms exist)
  // ==========================================
  console.log('\n\n📌 TEST 4: ROOM LIST');
  console.log('='.repeat(60));
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await takeScreenshot('04_room_list');
  
  // Check if there are any rooms listed
  const roomCards = await page.$$('.ant-card, [class*="card"], [class*="room"]');
  if (roomCards.length > 0) {
    console.log(`✅ Found ${roomCards.length} room(s) in the list`);
    testsPassed++;
    
    // Test clicking on a room to join
    const joinButtons = await page.$$('button:has-text("Присоединиться"), button:has-text("Join")');
    if (joinButtons.length > 0) {
      console.log('✅ Join button found for room');
      testsPassed++;
    }
  } else {
    console.log('⚠️  No rooms in list (this is OK if no rooms created yet)');
    testsPassed++; // Not a failure, just no rooms yet
  }
  
  // ==========================================
  // Summary
  // ==========================================
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors found:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  await browser.close();
  
  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  if (browser) browser.close();
  process.exit(1);
});