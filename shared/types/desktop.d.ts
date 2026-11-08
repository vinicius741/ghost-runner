export interface UpdateState {
  status: 'disabled' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  currentVersion: string;
  version?: string;
  percent?: number;
  message?: string;
  errorCode?: 'release-unavailable' | 'network' | 'unknown';
  disabledReason?: 'development' | 'appimage-required' | 'unsigned-mac';
}

export interface DesktopBridge {
  isElectron: true;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateState>;
  installUpdate: () => Promise<void>;
  onUpdateState: (listener: (state: UpdateState) => void) => () => void;
}
