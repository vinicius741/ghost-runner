import { chromium as chromiumExtra } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import type { BrowserContext } from 'playwright';

// Apply the stealth plugin
chromiumExtra.use(stealth());

interface Geolocation {
  latitude: number;
  longitude: number;
}

interface Settings {
  geolocation?: Geolocation;
}

/**
 * Launches a persistent browser context using the local Google Chrome installation.
 * This handles the persistent user data directory and stealth configurations.
 */
const launchBrowser = async (): Promise<BrowserContext> => {
  const userDataDir = path.resolve(__dirname, '../../user_data');
  const settingsFile = path.resolve(__dirname, '../../settings.json');

  let geolocation: Geolocation = { latitude: -23.55052, longitude: -46.633308 }; // Default (São Paulo)

  try {
    if (fs.existsSync(settingsFile)) {
      const settingsContent = fs.readFileSync(settingsFile, 'utf8');
      const settings: Settings = JSON.parse(settingsContent);
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
  const context = await chromiumExtra.launchPersistentContext(userDataDir, {
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

export { launchBrowser };
