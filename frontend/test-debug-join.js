const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true
    });
    
    const page = await browser.newPage();
    
    // Intercept the request to see what's being sent
    page.on('request', request => {
        if (request.url().includes('/join')) {
            console.log('Request URL:', request.url());
            console.log('Request Method:', request.method());
            console.log('Request Post Data:', request.postData());
        }
    });
    
    console.log('=== Testing Join with Debug ===');
    
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
        await connectBtn.click();
        await page.waitForTimeout(3000);
    }
    
    await browser.close();
})();