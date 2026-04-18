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
    
    console.log('=== Testing Join Page ===');
    
    // Go to join page with a room code
    await page.goto('http://localhost/join?code=NMCpn');
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded:', page.url());
    
    // Find and fill the room code input
    const codeInput = await page.$('input[placeholder*="Код"]');
    if (codeInput) {
        console.log('Found code input');
        await codeInput.fill('NMCpn');
    }
    
    // Click the connect button
    const connectBtn = await page.$('button:has-text("Подключиться")');
    if (connectBtn) {
        console.log('Clicking connect button...');
        await connectBtn.click();
        
        // Wait for navigation or error
        await page.waitForTimeout(5000);
        
        console.log('Current URL after click:', page.url());
        
        // Check for errors in console
        console.log('\nConsole messages:');
        consoleMessages.forEach(m => {
            if (m.type === 'error' || m.text.includes('error') || m.text.includes('Error')) {
                console.log(`  [${m.type}] ${m.text}`);
            }
        });
    }
    
    await browser.close();
})();