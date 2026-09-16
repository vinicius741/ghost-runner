import { chromium as chromiumExtra } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { chromium as chromiumStandard } from 'playwright';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { BrowserContext } from 'playwright';
import { SETTINGS_FILE, USER_DATA_DIR, initializeRuntimeStorage } from './runtimePaths';

// Apply the stealth plugin (only used for headless mode)
chromiumExtra.use(stealth());

/**
 * Matches the errors Chromium emits when the persistent profile's singleton is
 * still held by a live browser process (e.g. "Opening in existing browser session"
 * on macOS or "user data directory is already in use" on Linux).
 */
const PROFILE_IN_USE_PATTERN =
  /opening in existing browser session|already in use|profile appears to be in use|ProcessSingleton/i;

/**
 * Detects launch errors caused by another Chromium instance holding the profile.
 * Exported for reuse and unit testing.
 */
export function isProfileInUseError(error: Error): boolean {
  return PROFILE_IN_USE_PATTERN.test(error.message);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function execFileAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      }
    });
  });
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes Chromium profile lock files left behind by an unclean shutdown.
 * Uses lstat so broken symlinks (the usual state of a stale SingletonLock) are
 * detected — existsSync follows symlinks and misses them.
 */
export function removeStaleLockFiles(profileDir: string, baseUserDataDir: string): void {
  const lockFiles = [
    path.join(profileDir, 'SingletonLock'),
    path.join(profileDir, 'SingletonSocket'),
    path.join(profileDir, 'SingletonCookie'),
    path.join(profileDir, 'lockfile'),
    path.join(baseUserDataDir, 'SingletonLock'),
    path.join(baseUserDataDir, 'lockfile'),
  ];

  for (const lockFile of lockFiles) {
    try {
      fs.lstatSync(lockFile);
      console.log(`Removing stale lock file: ${lockFile}`);
      fs.unlinkSync(lockFile);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') {
        console.warn(`Could not remove lock file ${lockFile}: ${error.message}`);
      }
    }
  }
}

/**
 * Terminates leftover browser processes still bound to the given profile directory.
 * Only processes launched with this app's exact `--user-data-dir` are matched, so
 * the user's personal Chrome instance is never affected. SIGTERM is tried first,
 * escalating to SIGKILL after a grace period. Returns how many processes were
 * targeted; unkillable processes are logged and skipped (best effort).
 */
export async function terminateStaleBrowserProcesses(profileDir: string): Promise<number> {
  if (process.platform === 'win32') {
    // pgrep is unavailable; Windows users must end stale Chrome processes manually.
    console.warn('Cannot reclaim profile on Windows automatically; close any Chrome window using this profile.');
    return 0;
  }

  let pids: number[] = [];
  try {
    const { stdout } = await execFileAsync('pgrep', ['-f', '--', `--user-data-dir=${escapeRegExp(profileDir)}`]);
    pids = stdout
      .split('\n')
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return 0; // pgrep exits non-zero when nothing matches — the common, healthy case
  }

  if (pids.length === 0) {
    return 0;
  }

  console.log(`Terminating ${pids.length} stale browser process(es) still holding the profile...`);
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (err) {
      console.warn(`Could not terminate stale browser process ${pid}: ${(err as Error).message}`);
    }
  }

  // Give Chrome a moment to flush the profile before escalating.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pids.some((pid) => isProcessAlive(pid))) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const survivors = pids.filter((pid) => isProcessAlive(pid));
  if (survivors.length > 0) {
    console.log(`Force killing ${survivors.length} browser process(es) that ignored SIGTERM...`);
    for (const pid of survivors) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already gone — nothing to do
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return pids.length;
}

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
  const baseUserDataDir = USER_DATA_DIR;
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
  initializeRuntimeStorage();
  const settingsFile = SETTINGS_FILE;
  const baseUserDataDir = USER_DATA_DIR;

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

  // Clear stale profile locks from previous unclean shutdowns
  removeStaleLockFiles(profileDir, baseUserDataDir);

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

        // A leftover Chrome holding the profile singleton is the usual cause of
        // "Opening in existing browser session" — reclaim the profile and retry
        // instead of burning the remaining attempts on a doomed launch.
        if (isProfileInUseError(err)) {
          const terminated = await terminateStaleBrowserProcesses(profileDir);
          removeStaleLockFiles(profileDir, baseUserDataDir);
          if (terminated > 0) {
            console.log(`Reclaimed profile from ${terminated} stale browser process(es).`);
          } else {
            console.warn('Profile reports as in use, but no stale browser process was found; cleared lock files.');
          }
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
  initializeRuntimeStorage();
  const settingsFile = SETTINGS_FILE;
  const baseUserDataDir = USER_DATA_DIR;

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

/**
 * Ensures the persistent profile is free for the next task run: terminates any
 * browser process still bound to it and clears leftover lock files. Call after
 * closing a browser context so a Chrome child that outlived context.close()
 * cannot hold the profile singleton and fail every later launch with
 * "Opening in existing browser session".
 */
export async function releaseProfileLock(): Promise<void> {
  initializeRuntimeStorage();
  const profileDir = getProfileDir();
  await terminateStaleBrowserProcesses(profileDir);
  removeStaleLockFiles(profileDir, USER_DATA_DIR);
}

export { launchBrowser };
