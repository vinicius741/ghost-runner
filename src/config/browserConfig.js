const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const path = require('path');

// Apply the stealth plugin
chromium.use(stealth());

/**
 * Launches a persistent browser context using the local Google Chrome installation.
 * This handles the persistent user data directory and stealth configurations.
 */
const launchBrowser = async () => {
  const userDataDir = path.resolve(__dirname, '../../user_data');
  const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  console.log(`Launching Chrome from: ${executablePath}`);
  console.log(`User Data Directory: ${userDataDir}`);

  // launchPersistentContext is used to maintain a persistent profile (cookies, localStorage, etc.)
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: executablePath,
    headless: false, // Visible window as requested for anti-bot
    viewport: null, // detailed in stealth guides to match window size
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      // Additional args can be added here if needed for specific bypassing
    ]
  });

  return context;
};

module.exports = { launchBrowser };
