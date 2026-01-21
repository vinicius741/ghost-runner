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
  headless?: boolean;
}

/**
 * Launches a persistent browser context using the local Google Chrome installation.
 * This handles the persistent user data directory and stealth configurations.
 */
const launchBrowser = async (): Promise<BrowserContext> => {
  const userDataDir = path.resolve(__dirname, '../../user_data');
  const settingsFile = path.resolve(__dirname, '../../settings.json');

  let geolocation: Geolocation = { latitude: -23.55052, longitude: -46.633308 }; // Default (São Paulo)
  let headless = true; // Default to headless on macOS to avoid SIGTRAP crashes

  try {
    if (fs.existsSync(settingsFile)) {
      const settingsContent = fs.readFileSync(settingsFile, 'utf8');
      const settings: Settings = JSON.parse(settingsContent);
      if (settings.geolocation) {
        geolocation = settings.geolocation;
      }
      if (settings.headless !== undefined) {
        headless = settings.headless;
      }
    }
  } catch (err) {
    console.error('Error loading settings for geolocation:', err);
  }

  console.log(`User Data Directory: ${userDataDir}`);
  console.log(`Using Geolocation: ${JSON.stringify(geolocation)}`);
  console.log(`Headless mode: ${headless}`);

  // Check for corrupted user data and clean if needed
  try {
    const lockFile = path.join(userDataDir, 'lockfile');
    if (fs.existsSync(lockFile)) {
      console.log('Removing stale browser lock file...');
      fs.unlinkSync(lockFile);
    }
  } catch {
    // Ignore cleanup errors
  }

  // Retry logic for transient Chrome crashes on macOS
  let context: BrowserContext | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      context = await chromiumExtra.launchPersistentContext(userDataDir, {
        headless,
        viewport: null,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        permissions: ['geolocation', 'notifications'],
        geolocation: geolocation,
      });
      break; // Success - exit retry loop
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`Launch attempt ${attempt + 1} failed, retrying...`);
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!context) {
    throw lastError || new Error('Failed to launch browser after multiple attempts');
  }

  // Ensure permissions are granted for all origins in the context
  await context.grantPermissions(['geolocation', 'notifications']);

  return context;
};

export { launchBrowser };
