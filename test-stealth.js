const { launchBrowser } = require('./browserConfig');

(async () => {
  try {
    console.log('Starting Stealth Browser Test...');
    const context = await launchBrowser();
    
    // In a persistent context, there might already be a page, or we create one.
    // launchPersistentContext usually opens a page by default.
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    console.log('Navigating to https://bot.sannysoft.com ...');
    await page.goto('https://bot.sannysoft.com');

    console.log('Page loaded. Please verify the results manually.');
    console.log('Look for "WebDriver" -> false (green).');
    
    // Keep it open for observation as per instructions
    console.log('Browser will remain open for 30 seconds for verification...');
    await page.waitForTimeout(30000); 
    
    console.log('Closing browser...');
    await context.close();
    console.log('Test Finished.');

  } catch (error) {
    console.error('An error occurred during the test:', error);
    process.exit(1);
  }
})();
