import { app, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { autoUpdater } from 'electron-updater';
import { createUpdateController } from './update-controller';
import { getUpdateDisabledReason } from './update-support';
import type { GlobalState } from './types';

export function initializeUpdater(state: GlobalState, prepareToInstall: () => Promise<void>): () => void {
  const disabledReason = getUpdateDisabledReason(app.isPackaged, process.platform, process.env.APPIMAGE);
  const enabled = !disabledReason;
  const controller = createUpdateController(autoUpdater, app.getVersion(), enabled, (next) => {
    const window = state.mainWindow;
    if (window && !window.isDestroyed()) window.webContents.send('updates:changed', next);
  }, prepareToInstall, disabledReason);

  // Only the dashboard's top-level frame may invoke privileged update actions.
  const authorize = (event: IpcMainInvokeEvent) => {
    const contents = state.mainWindow?.webContents;
    if (!contents || event.sender !== contents || event.senderFrame !== contents.mainFrame ||
        !state.uiUrl || new URL(event.senderFrame.url).origin !== new URL(state.uiUrl).origin) {
      throw new Error('Update request came from an untrusted window.');
    }
  };
  ipcMain.handle('updates:state', (event) => { authorize(event); return controller.getState(); });
  ipcMain.handle('updates:check', (event) => { authorize(event); return controller.check(); });
  ipcMain.handle('updates:install', (event) => { authorize(event); return controller.install(); });

  const startup = setTimeout(() => { void controller.check(); }, 10_000);
  const periodic = setInterval(() => { void controller.check(); }, 4 * 60 * 60 * 1000);
  startup.unref();
  periodic.unref();
  return () => {
    clearTimeout(startup);
    clearInterval(periodic);
    for (const channel of ['updates:state', 'updates:check', 'updates:install']) ipcMain.removeHandler(channel);
  };
}
