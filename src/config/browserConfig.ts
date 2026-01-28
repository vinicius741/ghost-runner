import { chromium as chromiumExtra } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { chromium as chromiumStandard } from 'playwright';
import path from 'path';
import fs from 'fs';
import type { BrowserContext } from 'playwright';

// Apply the stealth plugin (only used for headless mode)
chromiumExtra.use(stealth());

interface Geolocation {
  latitude: number;
  longitude: number;
}

interface Settings {
  geolocation?: Geolocation;
  headless?: boolean;
  profileDir?: string;
  browserChannel?: string;
  executablePath?: string;
}

/**
 * Gets or creates the profile directory for browser sessions.
 * Creates a new profile under user_data/profiles/ if not specified in settings.
 *
 * Error handling:
 * - Falls back to base user_data directory if profile creation fails
 * - Logs detailed error messages for debugging
 * - Handles permission errors gracefully
 */
function getOrCreateProfileDir(settings: Settings): string {
  const baseUserDataDir = path.resolve(__dirname, '../../user_data');
  const profilesDir = path.join(baseUserDataDir, 'profiles');

  // If profileDir is specified in settings and exists, use it
  if (settings.profileDir) {
    const specifiedProfile = path.isAbsolute(settings.profileDir)
      ? settings.profileDir
      : path.resolve(baseUserDataDir, settings.profileDir);

    if (fs.existsSync(specifiedProfile)) {
      try {
        // Verify directory is accessible by checking stats
        const stats = fs.statSync(specifiedProfile);
        if (!stats.isDirectory()) {
          console.warn(`Specified profile path is not a directory: ${specifiedProfile}, creating new profile...`);
        } else {
          console.log(`Using existing profile directory: ${specifiedProfile}`);
          return specifiedProfile;
        }
      } catch (err) {
        const error = err as Error;
        console.warn(`Cannot access specified profile directory '${specifiedProfile}': ${error.message}`);
        console.warn('Falling back to creating a new profile...');
      }
    } else {
      console.log(`Specified profile directory not found: ${specifiedProfile}, creating new profile...`);
    }
  }

  // Create profiles directory if it doesn't exist
  try {
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
      console.log(`Created profiles directory: ${profilesDir}`);
    }
  } catch (err) {
    const error = err as Error;
    console.error(`Failed to create profiles directory '${profilesDir}': ${error.message}`);
    console.error('Falling back to base user_data directory');
    // Fallback: return base directory if profiles dir cannot be created
    return baseUserDataDir;
  }

  // Create a new profile with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const newProfileDir = path.join(profilesDir, `profile-${timestamp}`);

  try {
    fs.mkdirSync(newProfileDir, { recursive: true });
    console.log(`Created new profile directory: ${newProfileDir}`);
    return newProfileDir;
  } catch (err) {
    const error = err as Error;
    console.error(`Failed to create profile directory '${newProfileDir}': ${error.message}`);
    console.error('Falling back to base user_data directory');
    // Fallback: return base directory if profile creation fails
    return baseUserDataDir;
  }
}

/**
 * Resolves the Chrome executable path.
 * Uses system Chrome via channel if not explicitly specified.
 */
async function resolveChromeExecutable(channel?: string, executablePath?: string): Promise<string | undefined> {
  if (executablePath) {
    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
    console.warn(`Specified executable path not found: ${executablePath}, falling back to channel`);
  }

  // Use channel to find system Chrome
  if (channel === 'chrome' || !channel) {
    // Playwright will resolve this automatically when we use channel: 'chrome'
    return undefined; // Let Playwright resolve it
  }

  return undefined;
}

/**
 * Launches a persistent browser context using system Chrome.
 * This handles the persistent user data directory and stealth configurations.
 */
const launchBrowser = async (): Promise<BrowserContext> => {
  const settingsFile = path.resolve(__dirname, '../../settings.json');
  const baseUserDataDir = path.resolve(__dirname, '../../user_data');

  let settings: Settings = {
    geolocation: { latitude: -23.55052, longitude: -46.633308 }, // Default (São Paulo)
    headless: false,
    browserChannel: 'chrome', // Default to system Chrome
  };

  // Load settings from file with comprehensive error handling
  try {
    if (fs.existsSync(settingsFile)) {
      try {
        const settingsContent = fs.readFileSync(settingsFile, 'utf8');
        const loadedSettings = JSON.parse(settingsContent);
        settings = { ...settings, ...loadedSettings };
        console.log(`Loaded settings from: ${settingsFile}`);
      } catch (parseError) {
        const error = parseError as Error;
        console.error(`Failed to parse settings file '${settingsFile}': ${error.message}`);
        console.warn('Using default settings due to parse error');
        // Continue with default settings
      }
    } else {
      console.log(`Settings file not found at '${settingsFile}', using defaults`);
    }
  } catch (readError) {
    const error = readError as Error;
    console.error(`Failed to read settings file '${settingsFile}': ${error.message}`);
    console.warn('Using default settings due to read error');
    // Continue with default settings
  }

  // Get or create profile directory
  const profileDir = getOrCreateProfileDir(settings);
  
  // Resolve Chrome executable
  const executablePath = await resolveChromeExecutable(settings.browserChannel, settings.executablePath);

  // Update settings with new profile if it was created or doesn't match
  const relativeProfile = path.relative(baseUserDataDir, profileDir);
  const currentProfileInSettings = settings.profileDir 
    ? (path.isAbsolute(settings.profileDir) 
        ? settings.profileDir 
        : path.resolve(baseUserDataDir, settings.profileDir))
    : null;
  
  if (!currentProfileInSettings || path.resolve(currentProfileInSettings) !== path.resolve(profileDir)) {
    try {
      settings.profileDir = relativeProfile;
      
      // Load existing settings or use defaults
      let settingsToWrite: Settings;
      if (fs.existsSync(settingsFile)) {
        try {
          settingsToWrite = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
          settingsToWrite.profileDir = relativeProfile;
        } catch (err) {
          // If file exists but is corrupted, use current settings
          console.warn('Settings file exists but is corrupted, recreating...');
          settingsToWrite = { ...settings };
        }
      } else {
        // Create new settings file with defaults and profile directory
        settingsToWrite = {
          geolocation: settings.geolocation,
          headless: settings.headless ?? false,
          browserChannel: settings.browserChannel || 'chrome',
          profileDir: relativeProfile,
        };
      }
      
      // Ensure all current settings are preserved
      settingsToWrite = {
        ...settingsToWrite,
        profileDir: relativeProfile,
        geolocation: settings.geolocation,
        headless: settings.headless,
        browserChannel: settings.browserChannel,
        executablePath: settings.executablePath,
      };
      
      // Write settings file (create if it doesn't exist)
      fs.writeFileSync(settingsFile, JSON.stringify(settingsToWrite, null, 2));
      console.log(`Updated settings with profile directory: ${relativeProfile}`);
    } catch (err) {
      console.warn('Could not update settings with profile directory:', err);
    }
  }

  // Diagnostics
  console.log(`Browser Channel: ${settings.browserChannel || 'chrome'}`);
  if (executablePath) {
    console.log(`Chrome Executable: ${executablePath}`);
  } else {
    console.log(`Chrome Executable: System Chrome (via channel)`);
  }
  console.log(`Profile Directory: ${profileDir}`);
  console.log(`Using Geolocation: ${JSON.stringify(settings.geolocation)}`);
  console.log(`Headless mode: ${settings.headless}`);
  console.log(`Browser mode: ${settings.headless ? 'Stealth (playwright-extra)' : 'Standard (debuggable)'}`);

  // Check for profile lock files
  const lockFiles = [
    path.join(profileDir, 'SingletonLock'),
    path.join(profileDir, 'lockfile'),
    path.join(baseUserDataDir, 'SingletonLock'),
    path.join(baseUserDataDir, 'lockfile'),
  ];

  for (const lockFile of lockFiles) {
    try {
      if (fs.existsSync(lockFile)) {
        console.log(`Removing stale lock file: ${lockFile}`);
        fs.unlinkSync(lockFile);
      }
    } catch (err) {
      console.warn(`Could not remove lock file ${lockFile}:`, err);
    }
  }

  // Verify executable exists if explicitly provided
  if (executablePath && !fs.existsSync(executablePath)) {
    throw new Error(`Chrome executable not found at: ${executablePath}`);
  }

  // Retry logic for transient Chrome crashes on macOS
  let context: BrowserContext | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Use standard Chromium for non-headless (stealth plugin causes IPC issues on macOS)
      // Use playwright-extra with stealth for headless mode
      const chromium = settings.headless ? chromiumExtra : chromiumStandard;

      const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
        channel: settings.browserChannel || 'chrome',
        headless: settings.headless,
        viewport: null,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        permissions: ['geolocation', 'notifications'],
        geolocation: settings.geolocation,
      };

      // Only set executablePath if explicitly provided
      if (executablePath) {
        launchOptions.executablePath = executablePath;
        // Remove channel when using explicit executablePath
        delete launchOptions.channel;
      }

      console.log(`Launch attempt ${attempt + 1}/3...`);
      context = await chromium.launchPersistentContext(profileDir, launchOptions);
      console.log('Browser launched successfully!');
      break; // Success - exit retry loop
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`Launch attempt ${attempt + 1} failed, retrying...`);
      if (err instanceof Error) {
        console.error(`Error details: ${err.message}`);
        // Check for common error patterns and provide guidance
        if (err.message.includes('Target page, context or browser has been closed')) {
          console.error('Browser closed unexpectedly. This may indicate:');
          console.error('  - Chrome is already running with this profile');
          console.error('  - Profile corruption (try creating a new profile)');
          console.error('  - Insufficient permissions');
        }
      }
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!context) {
    const errorMsg = lastError?.message || 'Unknown error';
    console.error(`Failed to launch browser after 3 attempts. Last error: ${errorMsg}`);
    console.error(`Profile directory: ${profileDir}`);
    console.error(`Browser channel: ${settings.browserChannel || 'chrome'}`);
    if (executablePath) {
      console.error(`Executable path: ${executablePath}`);
    }
    console.error(`Troubleshooting:`);
    console.error(`  1. Check if Chrome is already running with this profile`);
    console.error(`  2. Verify Chrome is installed and accessible`);
    console.error(`  3. Try creating a new profile or clearing profile locks`);
    throw lastError || new Error('Failed to launch browser after multiple attempts');
  }

  // Ensure permissions are granted for all origins in the context
  await context.grantPermissions(['geolocation', 'notifications']);

  return context;
};

/**
 * Gets the current profile directory path from settings.
 * Used by other scripts that need to know the profile location.
 */
export function getProfileDir(): string {
  const settingsFile = path.resolve(__dirname, '../../settings.json');
  const baseUserDataDir = path.resolve(__dirname, '../../user_data');

  try {
    if (fs.existsSync(settingsFile)) {
      const settingsContent = fs.readFileSync(settingsFile, 'utf8');
      const settings: Settings = JSON.parse(settingsContent);
      
      if (settings.profileDir) {
        const profilePath = path.isAbsolute(settings.profileDir)
          ? settings.profileDir
          : path.resolve(baseUserDataDir, settings.profileDir);
        
        if (fs.existsSync(profilePath)) {
          return profilePath;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading profile directory from settings:', err);
  }

  // Fallback: return base user_data directory
  return baseUserDataDir;
}

export { launchBrowser };
