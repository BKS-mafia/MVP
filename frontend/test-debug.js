const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    
    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push(error.message);
    });
    
    console.log('=== Testing Main Page ===');
    await page.goto('http://localhost/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/debug_01_main.png', fullPage: true });
    
    console.log('\nConsole messages on main page:');
    consoleMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));
    
    if (pageErrors.length > 0) {
        console.log('\nPage errors:');
        pageErrors.forEach(e => console.log(`  ERROR: ${e}`));
    }
    
    // Check for Create Room button
    console.log('\n=== Looking for Create Room button ===');
    const createRoomBtn = page.locator('button:has-text("Создать комнату")');
    const btnCount = await createRoomBtn.count();
    console.log(`Found ${btnCount} buttons with "Создать комнату"`);
    
    if (btnCount > 0) {
        console.log('Button is visible:', await createRoomBtn.first().isVisible());
    }
    
    // Click the button and see what happens
    console.log('\n=== Clicking Create Room button ===');
    try {
        await createRoomBtn.first().click();
        await page.waitForTimeout(3000); // Wait for any navigation
        await page.screenshot({ path: 'test-screenshots/debug_02_after_click.png', fullPage: true });
        console.log('Current URL after click:', page.url());
        
        // Check console messages after click
        console.log('\nConsole messages after click:');
        consoleMessages.slice(5).forEach(m => console.log(`  [${m.type}] ${m.text}`));
        
        if (pageErrors.length > 0) {
            console.log('\nPage errors after click:');
            pageErrors.forEach(e => console.log(`  ERROR: ${e}`));
        }
    } catch (e) {
        console.log('Error clicking button:', e.message);
    }
    
    await browser.close();
    console.log('\n=== Test Complete ===');
})();