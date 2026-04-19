const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage();
  
  // Navigate to roomEdit page
  console.log('Navigating to http://localhost/roomEdit...');
  await page.goto('http://localhost/roomEdit');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  console.log('Page title:', await page.title());
  
  // Check for main elements
  console.log('\n=== Checking main elements ===');
  
  // Check for "На главную" button
  const backButton = await page.locator('button:has-text("На главную")');
  if (await backButton.isVisible()) {
    console.log('✓ "На главную" button is visible');
  } else {
    console.log('✗ "На главную" button NOT found');
  }
  
  // Check for "Настройки игры" title
  const title = await page.locator('h3:has-text("Настройки игры")');
  if (await title.isVisible()) {
    console.log('✓ "Настройки игры" title is visible');
  } else {
    console.log('✗ "Настройки игры" title NOT found');
  }
  
  // Check for total players input (Ant Design uses input-number class)
  const totalPlayersInput = await page.locator('.ant-input-number').first();
  if (await totalPlayersInput.isVisible()) {
    console.log('✓ Total players input is visible');
    const value = await totalPlayersInput.textContent();
    console.log(`  Current value: ${value}`);
  } else {
    console.log('✗ Total players input NOT found');
  }
  
  // Check for slider
  const slider = await page.locator('.ant-slider');
  if (await slider.isVisible()) {
    console.log('✓ People/AI slider is visible');
  } else {
    console.log('✗ Slider NOT found');
  }
  
  // Check for roles table
  const rolesTable = await page.locator('.ant-table');
  if (await rolesTable.isVisible()) {
    console.log('✓ Roles table is visible');
    
    // Check table rows
    const rows = await page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();
    console.log(`  Found ${rowCount} role rows`);
  } else {
    console.log('✗ Roles table NOT found');
  }
  
  // Check for "Старт игры" button
  const startButton = await page.locator('button:has-text("Старт игры")');
  if (await startButton.isVisible()) {
    console.log('✓ "Старт игры" button is visible');
    const isDisabled = await startButton.isDisabled();
    console.log(`  Button disabled: ${isDisabled}`);
  } else {
    console.log('✗ "Старт игры" button NOT found');
  }
  
  // Check for text elements
  console.log('\n=== Checking text elements ===');
  
  // Check for "Общее число игроков"
  const totalPlayersLabel = await page.locator('text=Общее число игроков');
  if (await totalPlayersLabel.isVisible()) {
    console.log('✓ "Общее число игроков" label is visible');
  } else {
    console.log('✗ "Общее число игроков" label NOT found');
  }
  
  // Check for "Люди" and "ИИ" labels
  const peopleLabel = await page.locator('text=Люди:');
  if (await peopleLabel.isVisible()) {
    console.log('✓ "Люди:" label is visible');
  } else {
    console.log('✗ "Люди:" label NOT found');
  }
  
  const aiLabel = await page.locator('text=ИИ:');
  if (await aiLabel.isVisible()) {
    console.log('✓ "ИИ:" label is visible');
  } else {
    console.log('✗ "ИИ:" label NOT found');
  }
  
  // Check for "Роли" title
  const rolesTitle = await page.locator('h4:has-text("Роли")');
  if (await rolesTitle.isVisible()) {
    console.log('✓ "Роли" title is visible');
  } else {
    console.log('✗ "Роли" title NOT found');
  }
  
  // Check for role names in table
  console.log('\n=== Checking role names in table ===');
  const roleNames = ['Мирный', 'Мафия', 'Комиссар', 'Доктор'];
  for (const roleName of roleNames) {
    const roleCell = await page.locator(`.ant-table-tbody td:has-text("${roleName}")`);
    if (await roleCell.isVisible()) {
      console.log(`✓ Role "${roleName}" is visible in table`);
    } else {
      console.log(`✗ Role "${roleName}" NOT found in table`);
    }
  }
  
  // Check for column headers
  console.log('\n=== Checking table column headers ===');
  const headers = ['Роль', 'Количество', 'Может быть человеком', 'Может быть ИИ'];
  for (const header of headers) {
    const headerCell = await page.locator(`.ant-table-thead th:has-text("${header}")`);
    if (await headerCell.isVisible()) {
      console.log(`✓ Column header "${header}" is visible`);
    } else {
      console.log(`✗ Column header "${header}" NOT found`);
    }
  }
  
  // Check for range labels (1 and max players)
  const minLabel = await page.locator('text=1');
  if (await minLabel.first().isVisible()) {
    console.log('✓ Min label "1" is visible');
  }
  // Check for max label (should show total players count, e.g., "8")
  const maxLabel = await page.locator('.ant-col:has-text("20")');
  if (await maxLabel.isVisible()) {
    console.log('✓ Max label "20" is visible');
  }
  
  // Take screenshot
  console.log('\n=== Taking screenshot ===');
  await page.screenshot({ path: 'test-roomedit-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-roomedit-screenshot.png');
  
  // Check console for errors
  console.log('\n=== Console messages ===');
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
  
  await browser.close();
  console.log('\n=== Test completed ===');
  console.log('Browser closed');
})();