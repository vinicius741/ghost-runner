import { app } from 'electron';
import type { Event } from 'electron';
import { GlobalState } from './lib/types';
import { initializeTray, destroyTray, updateTrayPresentation } from './lib/tray';
import { showMainWindow } from './lib/window';
import { startBackendAndUi, shutdownBackend } from './lib/backend';

const state: GlobalState = {
  mainWindow: null,
  ghostServer: null,
  backendPort: null,
  isShuttingDown: false,
  uiUrl: null,
  tray: null,
  trayPollTimer: null,
  trayCountdownTimer: null,
  trayIsRefreshing: false,
  trayLastAction: null,
  trayState: {
    schedulerRunning: null,
    nextTask: null,
    tasks: [],
    lastError: null,
  },
};

async function handleBeforeQuit(event: Event): Promise<void> {
  if (state.isShuttingDown) {
    return;
  }

  event.preventDefault();
  state.isShuttingDown = true;

  try {
    destroyTray(state);
    await shutdownBackend(state);
  } finally {
    app.quit();
  }
}

app.on('before-quit', (event) => {
  void handleBeforeQuit(event);
});

app.whenReady().then(async () => {
  try {
    await startBackendAndUi(state);
    initializeTray(state);
  } catch (error) {
    console.error('Failed to start Ghost Runner desktop:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start Ghost Runner: ${error instanceof Error ? error.message : String(error)}`
    );
    app.exit(1);
    return;
  }

  app.on('activate', () => {
    showMainWindow(state, (rebuild) => updateTrayPresentation(state, rebuild));
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
