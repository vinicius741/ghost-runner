import { app, BrowserWindow, shell, dialog, session } from 'electron';
import type { Event } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';

interface GhostServerInstance {
  start: (preferredPort?: number) => Promise<number>;
  stop: () => Promise<void>;
  getPort: () => number | null;
}

interface GhostServerModule {
  createGhostServer: (options?: { port?: number }) => GhostServerInstance;
}

let mainWindow: BrowserWindow | null = null;
let ghostServer: GhostServerInstance | null = null;
let backendPort: number | null = null;
let isShuttingDown = false;
let uiUrl: string | null = null;
const ALLOWED_PERMISSIONS = new Set(['geolocation', 'notifications']);
const HEALTHCHECK_TIMEOUT_MS = 12_000;
const HEALTHCHECK_INTERVAL_MS = 300;
const HEALTHCHECK_REQUEST_TIMEOUT_MS = 1_500;

function configureRuntimeEnvironment(appRoot: string): void {
  const dataRoot = path.join(app.getPath('userData'), 'ghost-runner');

  process.env.GHOST_RUNNER_APP_ROOT = appRoot;
  process.env.GHOST_RUNNER_DATA_DIR = dataRoot;
}

function toUniquePaths(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const candidate of paths) {
    if (!candidate) {
      continue;
    }

    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) {
      continue;
    }

    seen.add(resolved);
    unique.push(resolved);
  }

  return unique;
}

function getServerRootCandidates(): string[] {
  return toUniquePaths([
    process.env.GHOST_RUNNER_APP_ROOT,
    app.getAppPath(),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked') : null,
    process.cwd(),
  ]);
}

function resolveServerModuleLocation(): { appRoot: string; serverEntry: string } {
  const candidates = getServerRootCandidates();

  for (const appRoot of candidates) {
    const serverEntry = path.join(appRoot, 'dist', 'src', 'server', 'index.js');
    if (fs.existsSync(serverEntry)) {
      return { appRoot, serverEntry };
    }
  }

  throw new Error(
    `Server entry not found. Checked:\n${candidates.map((candidate) => `- ${candidate}`).join('\n')}`
  );
}

function loadServerModule(serverEntry: string): GhostServerModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(serverEntry) as GhostServerModule;
}

function normalizeOrigin(input: string): string | null {
  try {
    return new URL(input).origin.toLowerCase();
  } catch {
    return null;
  }
}

function buildAllowedOrigins(targetUrl: string): Set<string> {
  const parsed = new URL(targetUrl);
  const allowed = new Set<string>([parsed.origin.toLowerCase()]);

  if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
    const portSuffix = parsed.port ? `:${parsed.port}` : '';
    allowed.add(`${parsed.protocol}//127.0.0.1${portSuffix}`.toLowerCase());
    allowed.add(`${parsed.protocol}//localhost${portSuffix}`.toLowerCase());
  }

  return allowed;
}

function isUiOriginAllowed(origin: string, allowedOrigins: Set<string>): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return false;
  }
  return allowedOrigins.has(normalized);
}

function configurePermissions(allowedOrigins: Set<string>): void {
  const defaultSession = session.defaultSession;

  defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (!ALLOWED_PERMISSIONS.has(permission)) {
      callback(true);
      return;
    }

    let origin = webContents?.getURL() || '';
    if ('requestingOrigin' in details && typeof details.requestingOrigin === 'string') {
      origin = details.requestingOrigin || origin;
    } else if ('requestingUrl' in details && typeof details.requestingUrl === 'string') {
      origin = details.requestingUrl || origin;
    }

    callback(isUiOriginAllowed(origin, allowedOrigins));
  });
}

function createMainWindow(targetUrl: string): void {
  const preloadPath = path.join(__dirname, 'preload.js');
  const allowedOrigins = buildAllowedOrigins(targetUrl);
  configurePermissions(allowedOrigins);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  void mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRequestModule(protocol: string): typeof http | typeof https {
  if (protocol === 'https:') {
    return https;
  }
  return http;
}

function probeUrlStatus(url: URL): Promise<number | null> {
  return new Promise((resolve) => {
    const transport = resolveRequestModule(url.protocol);
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        timeout: HEALTHCHECK_REQUEST_TIMEOUT_MS,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? null);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });

    req.end();
  });
}

async function waitForServerHealth(baseUrl: string): Promise<void> {
  const startedAt = Date.now();
  const timeoutAt = startedAt + HEALTHCHECK_TIMEOUT_MS;
  const endpoints = [new URL('/health', baseUrl), new URL('/api/health', baseUrl)];

  while (Date.now() < timeoutAt) {
    for (const endpoint of endpoints) {
      const status = await probeUrlStatus(endpoint);
      if (status !== null && status >= 200 && status < 300) {
        return;
      }
    }

    await sleep(HEALTHCHECK_INTERVAL_MS);
  }

  throw new Error(
    `Backend health check timed out after ${HEALTHCHECK_TIMEOUT_MS}ms for ${baseUrl}`
  );
}

function resolveExternalServerUrl():
  | { url: string; sourceEnv: 'GHOST_RUNNER_SERVER_URL' | 'GHOST_RUNNER_API_URL' }
  | null {
  const candidates: Array<{ name: 'GHOST_RUNNER_SERVER_URL' | 'GHOST_RUNNER_API_URL'; value?: string }> = [
    { name: 'GHOST_RUNNER_SERVER_URL', value: process.env.GHOST_RUNNER_SERVER_URL },
    { name: 'GHOST_RUNNER_API_URL', value: process.env.GHOST_RUNNER_API_URL },
  ];

  for (const candidate of candidates) {
    const rawValue = candidate.value?.trim();
    if (!rawValue) {
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawValue);
    } catch {
      throw new Error(`${candidate.name} is not a valid URL: ${rawValue}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`${candidate.name} must use http or https: ${rawValue}`);
    }

    parsed.pathname = '/';
    parsed.search = '';
    parsed.hash = '';

    return {
      url: parsed.toString(),
      sourceEnv: candidate.name,
    };
  }

  return null;
}

async function startBackendAndUi(): Promise<void> {
  const externalServer = resolveExternalServerUrl();
  if (externalServer) {
    console.log(
      `Using external Ghost Runner server from ${externalServer.sourceEnv}: ${externalServer.url}`
    );
    await waitForServerHealth(externalServer.url);
    uiUrl = externalServer.url;
    createMainWindow(externalServer.url);
    return;
  }

  const { appRoot, serverEntry } = resolveServerModuleLocation();
  configureRuntimeEnvironment(appRoot);
  const serverModule = loadServerModule(serverEntry);

  ghostServer = serverModule.createGhostServer({ port: 0 });
  backendPort = await ghostServer.start(0);
  uiUrl = `http://127.0.0.1:${backendPort}`;
  await waitForServerHealth(uiUrl);

  createMainWindow(uiUrl);
}

async function shutdownBackend(): Promise<void> {
  if (!ghostServer) {
    return;
  }

  try {
    await ghostServer.stop();
  } catch (error) {
    console.error('Error while stopping backend server:', error);
  } finally {
    ghostServer = null;
    backendPort = null;
    uiUrl = null;
  }
}

async function handleBeforeQuit(event: Event): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  event.preventDefault();
  isShuttingDown = true;
  await shutdownBackend();
  app.exit(0);
}

app.on('before-quit', (event) => {
  void handleBeforeQuit(event);
});

app.whenReady().then(async () => {
  try {
    await startBackendAndUi();
  } catch (error) {
    console.error('Failed to start Ghost Runner desktop:', error);
    dialog.showErrorBox(
      'Startup Error',
      error instanceof Error ? error.message : 'Unknown startup error'
    );
    app.exit(1);
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && uiUrl !== null) {
      createMainWindow(uiUrl);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
