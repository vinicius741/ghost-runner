import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge, UpdateState } from '../shared/types/desktop';

contextBridge.exposeInMainWorld('ghostRunnerDesktop', {
  isElectron: true,
  getUpdateState: () => ipcRenderer.invoke('updates:state'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateState: (listener: (state: UpdateState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => listener(state);
    ipcRenderer.on('updates:changed', handler);
    return () => ipcRenderer.removeListener('updates:changed', handler);
  },
} satisfies DesktopBridge);
