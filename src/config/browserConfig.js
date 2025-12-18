const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

// Apply the stealth plugin
chromium.use(stealth());

/**
 * Launches a persistent browser context using the local Google Chrome installation.
 * This handles the persistent user data directory and stealth configurations.
 */
const launchBrowser = async () => {
  const userDataDir = path.resolve(__dirname, '../../user_data');
  const settingsFile = path.resolve(__dirname, '../../settings.json');

  let geolocation = { latitude: -23.55052, longitude: -46.633308 }; // Default (São Paulo)

  try {
    if (fs.existsSync(settingsFile)) {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      if (settings.geolocation) {
        geolocation = settings.geolocation;
      }
    }
  } catch (err) {
    console.error('Error loading settings for geolocation:', err);
  }

  console.log(`User Data Directory: ${userDataDir}`);
  console.log(`Using Geolocation: ${JSON.stringify(geolocation)}`);

  // launchPersistentContext is used to maintain a persistent profile (cookies, localStorage, etc.)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Visible window as requested for anti-bot
    viewport: null, // detailed in stealth guides to match window size
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Additional args can be added here if needed for specific bypassing
    ],
    permissions: ['geolocation', 'notifications'],
    geolocation: geolocation,
  });

  // Ensure permissions are granted for all origins in the context
  await context.grantPermissions(['geolocation', 'notifications']);

  return context;
};

module.exports = { launchBrowser };
