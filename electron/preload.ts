import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('ghostRunnerDesktop', {
  isElectron: true,
});
