import { launchBrowser } from '../config/browserConfig';

(async (): Promise<void> => {
  try {
    console.log('Verifying Session Persistence...');
    const context = await launchBrowser();
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    console.log('Navigating to Google Account page...');
    await page.goto('https://myaccount.google.com/');

    console.log('Please check the browser window.');
    console.log('If you are already logged in, the session persistence is working.');

    // Keep it open for a short while to allow visual verification
    await page.waitForTimeout(10000);

    console.log('Closing verification browser...');
    await context.close();
  } catch (error) {
    console.error('Error verifying session:', error);
  }
})();
