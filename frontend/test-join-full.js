const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true
    });
    
    const page = await browser.newPage();
    
    console.log('=== Testing Full Join Flow ===');
    
    // Go to join page
    await page.goto('http://localhost/join?code=NMCpn');
    await page.waitForLoadState('networkidle');
    
    // Fill the code
    const codeInput = await page.$('input[placeholder*="Код"]');
    if (codeInput) {
        await codeInput.fill('NMCpn');
    }
    
    // Click connect
    const connectBtn = await page.$('button:has-text("Подключиться")');
    if (connectBtn) {
        console.log('Clicking connect button...');
        await connectBtn.click();
        
        // Wait for navigation
        await page.waitForTimeout(5000);
        
        console.log('Final URL:', page.url());
        
        // Check if we're on the lobby page
        if (page.url().includes('/lobby')) {
            console.log('✅ Successfully joined the room and redirected to lobby!');
        } else if (page.url().includes('/join')) {
            console.log('❌ Still on join page - something went wrong');
        } else {
            console.log('⚠️  Navigated to:', page.url());
        }
    }
    
    await browser.close();
})();