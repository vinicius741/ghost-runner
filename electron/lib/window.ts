import { BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { ALLOWED_PERMISSIONS } from './constants';
import { buildAllowedOrigins, isUiOriginAllowed } from './network';
import { GlobalState } from './types';

export function configurePermissions(allowedOrigins: Set<string>): void {
    const defaultSession = session.defaultSession;

    defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        if (!ALLOWED_PERMISSIONS.has(permission)) {
            // Permission is not allowed by default
            callback(false);
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

export function createMainWindow(state: GlobalState, targetUrl: string, onTrayUpdate: (rebuildMenu?: boolean) => void): void {
    const preloadPath = path.join(__dirname, '..', 'preload.js');
    const allowedOrigins = buildAllowedOrigins(targetUrl);
    configurePermissions(allowedOrigins);

    state.mainWindow = new BrowserWindow({
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
            partition: 'persist:ghost-runner-ui',
        },
    });

    state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: 'deny' };
    });

    state.mainWindow.once('ready-to-show', () => {
        state.mainWindow?.show();
    });

    void state.mainWindow.loadURL(targetUrl);

    state.mainWindow.on('show', () => {
        onTrayUpdate(true);
    });

    state.mainWindow.on('hide', () => {
        onTrayUpdate(true);
    });

    state.mainWindow.on('closed', () => {
        state.mainWindow = null;
        onTrayUpdate(true);
    });
}

export function showMainWindow(state: GlobalState, onTrayUpdate: (rebuildMenu?: boolean) => void): void {
    if (state.mainWindow) {
        if (state.mainWindow.isMinimized()) {
            state.mainWindow.restore();
        }
        state.mainWindow.show();
        state.mainWindow.focus();
        return;
    }

    if (state.uiUrl !== null) {
        createMainWindow(state, state.uiUrl, onTrayUpdate);
    }
}

export function toggleMainWindow(state: GlobalState, onTrayUpdate: (rebuildMenu?: boolean) => void): void {
    if (!state.mainWindow) {
        showMainWindow(state, onTrayUpdate);
        return;
    }

    if (state.mainWindow.isVisible() && state.mainWindow.isFocused()) {
        state.mainWindow.hide();
        return;
    }

    showMainWindow(state, onTrayUpdate);
}
