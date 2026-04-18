const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true
    });
    
    const page = await browser.newPage();
    
    console.log('=== Testing Join Page ===');
    await page.goto('http://localhost/join');
    await page.waitForLoadState('networkidle');
    
    // Get all input fields
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields`);
    
    for (let i = 0; i < inputs.length; i++) {
        const placeholder = await inputs[i].getAttribute('placeholder');
        const type = await inputs[i].getAttribute('type');
        const id = await inputs[i].getAttribute('id');
        const name = await inputs[i].getAttribute('name');
        console.log(`Input ${i}: placeholder="${placeholder}", type="${type}", id="${id}", name="${name}"`);
    }
    
    // Try to find input with "код" in placeholder
    const codeInput = await page.$('input[placeholder*="код"]');
    console.log(`\nDirect selector input[placeholder*="код"]: ${codeInput ? 'FOUND' : 'NOT FOUND'}`);
    
    // Try with case insensitive
    const codeInput2 = await page.$('input');
    console.log(`First input found: ${codeInput2 ? 'YES' : 'NO'}`);
    if (codeInput2) {
        const ph = await codeInput2.getAttribute('placeholder');
        console.log(`First input placeholder: ${ph}`);
    }
    
    await page.screenshot({ path: 'test-screenshots/debug_join.png', fullPage: true });
    
    await browser.close();
})();