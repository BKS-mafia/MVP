const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Collect ALL console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    
    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push(error.message);
    });
    
    // Collect network failures
    const networkErrors = [];
    page.on('requestfailed', request => {
        networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log('=== Testing Main Page ===');
    await page.goto('http://localhost/', { waitUntil: 'networkidle' });
    
    // Clear messages after initial load
    consoleMessages.length = 0;
    pageErrors.length = 0;
    networkErrors.length = 0;
    
    console.log('\n=== Looking for Create Room button ===');
    const createRoomBtn = page.locator('button:has-text("Создать комнату")');
    const btnCount = await createRoomBtn.count();
    console.log(`Found ${btnCount} buttons with "Создать комнату"`);
    
    if (btnCount > 0) {
        console.log('Button is visible:', await createRoomBtn.first().isVisible());
    }
    
    // Click the button and wait for network
    console.log('\n=== Clicking Create Room button ===');
    try {
        await createRoomBtn.first().click();
        
        // Wait for any network requests to complete
        await page.waitForTimeout(5000);
        
        console.log('Current URL after click:', page.url());
        
        // Check console messages
        console.log('\nConsole messages after click:');
        consoleMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));
        
        if (pageErrors.length > 0) {
            console.log('\nPage errors after click:');
            pageErrors.forEach(e => console.log(`  ERROR: ${e}`));
        }
        
        if (networkErrors.length > 0) {
            console.log('\nNetwork errors:');
            networkErrors.forEach(e => console.log(`  ${e}`));
        }
        
        // Check for any visible error messages
        const errorMessages = page.locator('.ant-message-error, [class*="error"], .ant-alert-error');
        const errorCount = await errorMessages.count();
        console.log(`\nVisible error elements: ${errorCount}`);
        
        // Check page content
        const pageContent = await page.content();
        if (pageContent.includes('Не удалось создать комнату')) {
            console.log('Found error message in page content: "Не удалось создать комнату"');
        }
        
    } catch (e) {
        console.log('Error clicking button:', e.message);
    }
    
    await browser.close();
    console.log('\n=== Test Complete ===');
})();