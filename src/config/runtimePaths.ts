import fs from 'fs';
import path from 'path';

const DEFAULT_SETTINGS = {
  geolocation: { latitude: -23.55052, longitude: -46.633308 },
  headless: false,
  browserChannel: 'chrome',
};

const DEFAULT_INFO_GATHERING = {
  version: 1,
  tasks: {},
};

function resolveProjectRoot(): string {
  if (process.env.GHOST_RUNNER_APP_ROOT) {
    return path.resolve(process.env.GHOST_RUNNER_APP_ROOT);
  }

  let currentDir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidate = currentDir;
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
    currentDir = path.resolve(currentDir, '..');
  }

  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    return process.cwd();
  }

  return process.cwd();
}

function copyMissingFiles(sourceDir: string, targetDir: string): void {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyMissingFiles(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function ensureJsonFile(filePath: string, fallbackValue: unknown): void {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2));
}

function ensureTextFile(filePath: string, fallbackContent: string): void {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fallbackContent, 'utf8');
}

export const APP_ROOT = resolveProjectRoot();
export const DATA_ROOT = process.env.GHOST_RUNNER_DATA_DIR
  ? path.resolve(process.env.GHOST_RUNNER_DATA_DIR)
  : APP_ROOT;

export const TASKS_DIR = path.join(DATA_ROOT, 'tasks');
export const USER_DATA_DIR = path.join(DATA_ROOT, 'user_data');
export const SETTINGS_FILE = path.join(DATA_ROOT, 'settings.json');
export const SCHEDULE_FILE = path.join(DATA_ROOT, 'schedule.json');
export const FAILURES_FILE = path.join(DATA_ROOT, 'failures.json');
export const INFO_GATHERING_FILE = path.join(DATA_ROOT, 'info-gathering.json');
export const LOG_FILE = path.join(DATA_ROOT, 'scheduler.log');

export const FRONTEND_DIST_DIR = path.join(APP_ROOT, 'frontend', 'dist');
export const SERVER_PUBLIC_DIR = path.join(APP_ROOT, 'src', 'server', 'public');

export const BUNDLED_TASKS_DIR = path.join(APP_ROOT, 'tasks');
export const BUNDLED_SETTINGS_FILE = path.join(APP_ROOT, 'settings.json');
export const BUNDLED_SCHEDULE_FILE = path.join(APP_ROOT, 'schedule.json');
export const BUNDLED_FAILURES_FILE = path.join(APP_ROOT, 'failures.json');
export const BUNDLED_INFO_GATHERING_FILE = path.join(APP_ROOT, 'info-gathering.json');

export type TaskRootSearchOrder = 'writable-first' | 'bundled-first';

/**
 * Returns unique task roots in the requested precedence order.
 * When both directories resolve to the same path, returns a single entry.
 */
export function getTaskRoots(
  writableTasksDir: string = TASKS_DIR,
  bundledTasksDir: string = BUNDLED_TASKS_DIR,
  order: TaskRootSearchOrder = 'writable-first'
): string[] {
  const writableResolved = path.resolve(writableTasksDir);
  const bundledResolved = path.resolve(bundledTasksDir);

  if (writableResolved === bundledResolved) {
    return [writableTasksDir];
  }

  return order === 'bundled-first'
    ? [bundledTasksDir, writableTasksDir]
    : [writableTasksDir, bundledTasksDir];
}

let initialized = false;

/**
 * Determines whether runtime should execute compiled JavaScript entrypoints.
 */
export function shouldUseCompiledEntry(compiledPath: string): boolean {
  if (!fs.existsSync(compiledPath)) {
    return false;
  }

  if (process.env.GHOST_RUNNER_USE_COMPILED === '1') {
    return true;
  }

  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return Boolean(process.versions.electron);
}

export function initializeRuntimeStorage(): void {
  if (initialized) {
    return;
  }

  fs.mkdirSync(TASKS_DIR, { recursive: true });
  fs.mkdirSync(path.join(TASKS_DIR, 'public'), { recursive: true });
  fs.mkdirSync(path.join(TASKS_DIR, 'private'), { recursive: true });
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  copyMissingFiles(path.join(BUNDLED_TASKS_DIR, 'public'), path.join(TASKS_DIR, 'public'));
  copyMissingFiles(path.join(BUNDLED_TASKS_DIR, 'private'), path.join(TASKS_DIR, 'private'));

  if (!fs.existsSync(SETTINGS_FILE) && fs.existsSync(BUNDLED_SETTINGS_FILE)) {
    fs.copyFileSync(BUNDLED_SETTINGS_FILE, SETTINGS_FILE);
  } else {
    ensureJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  }

  if (!fs.existsSync(SCHEDULE_FILE) && fs.existsSync(BUNDLED_SCHEDULE_FILE)) {
    fs.copyFileSync(BUNDLED_SCHEDULE_FILE, SCHEDULE_FILE);
  } else {
    ensureJsonFile(SCHEDULE_FILE, []);
  }

  if (!fs.existsSync(FAILURES_FILE) && fs.existsSync(BUNDLED_FAILURES_FILE)) {
    fs.copyFileSync(BUNDLED_FAILURES_FILE, FAILURES_FILE);
  } else {
    ensureJsonFile(FAILURES_FILE, []);
  }

  if (!fs.existsSync(INFO_GATHERING_FILE) && fs.existsSync(BUNDLED_INFO_GATHERING_FILE)) {
    fs.copyFileSync(BUNDLED_INFO_GATHERING_FILE, INFO_GATHERING_FILE);
  } else {
    ensureJsonFile(INFO_GATHERING_FILE, DEFAULT_INFO_GATHERING);
  }

  ensureTextFile(LOG_FILE, '');

  initialized = true;
}
