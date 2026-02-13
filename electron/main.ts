import { app, BrowserWindow, shell, dialog, session } from 'electron';
import type { Event } from 'electron';
import path from 'path';
import fs from 'fs';

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
const ALLOWED_PERMISSIONS = new Set(['geolocation', 'notifications']);

function getAppRoot(): string {
  return path.resolve(__dirname, '..');
}

function configureRuntimeEnvironment(): string {
  const appRoot = getAppRoot();
  const dataRoot = path.join(app.getPath('userData'), 'ghost-runner');

  process.env.GHOST_RUNNER_APP_ROOT = appRoot;
  process.env.GHOST_RUNNER_DATA_DIR = dataRoot;

  return appRoot;
}

function loadServerModule(appRoot: string): GhostServerModule {
  const serverEntry = path.join(appRoot, 'dist', 'src', 'server', 'index.js');
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server entry not found: ${serverEntry}. Run build:server first.`);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(serverEntry) as GhostServerModule;
}

function isLocalUiOrigin(origin: string, port: number): boolean {
  try {
    const parsed = new URL(origin);
    const isLocalHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
    return isLocalHost && parsed.port === String(port);
  } catch {
    return false;
  }
}

function configurePermissions(port: number): void {
  const defaultSession = session.defaultSession;

  defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (!ALLOWED_PERMISSIONS.has(permission)) {
      return true;
    }

    const origin = requestingOrigin || webContents?.getURL() || '';
    return isLocalUiOrigin(origin, port);
  });

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

    callback(isLocalUiOrigin(origin, port));
  });
}

function createMainWindow(port: number): void {
  const preloadPath = path.join(__dirname, 'preload.js');
  configurePermissions(port);

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

  void mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startBackendAndUi(): Promise<void> {
  const appRoot = configureRuntimeEnvironment();
  const serverModule = loadServerModule(appRoot);

  ghostServer = serverModule.createGhostServer({ port: 0 });
  backendPort = await ghostServer.start(0);

  createMainWindow(backendPort);
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
    if (BrowserWindow.getAllWindows().length === 0 && backendPort !== null) {
      createMainWindow(backendPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
