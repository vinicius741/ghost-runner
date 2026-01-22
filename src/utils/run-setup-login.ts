import { launchBrowser } from '../config/browserConfig';

(async (): Promise<void> => {
  try {
    console.log('Starting Setup Login...');
    console.log('This script will launch the browser and keep it open for 5 minutes.');
    console.log('PLEASE LOG IN TO GOOGLE MANUALLY NOW.');
    console.log('The session will be saved to the profile directory for future use.');

    const context = await launchBrowser();
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    // Navigate to a Google login entry point to make it easier
    await page.goto('https://accounts.google.com/');

    console.log('Browser launched. You have 5 minutes to log in.');

    // Keep open for 5 minutes (300,000 ms)
    await new Promise(resolve => setTimeout(resolve, 300000));

    console.log('Time is up. Closing browser...');
    await context.close();
    console.log('Setup script finished. Your login session has been saved.');

  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
})();
