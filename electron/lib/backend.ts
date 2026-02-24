import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { GlobalState, GhostServerModule } from './types';
import { resolveServerModuleLocation } from './paths';
import { waitForServerHealth } from './network';
import { createMainWindow } from './window';
import { updateTrayPresentation } from './tray';

export function configureRuntimeEnvironment(appRoot: string): void {
    const dataRoot = path.join(app.getPath('userData'), 'ghost-runner');
    process.env.GHOST_RUNNER_APP_ROOT = appRoot;
    process.env.GHOST_RUNNER_DATA_DIR = dataRoot;
}

export async function loadServerModule(serverEntry: string): Promise<GhostServerModule> {
    const rawModule = await import(serverEntry);
    return (rawModule.default || rawModule) as GhostServerModule;
}

export function resolveExternalServerUrl():
    | { url: string; sourceEnv: 'GHOST_RUNNER_SERVER_URL' | 'GHOST_RUNNER_API_URL' }
    | null {
    const candidates: Array<{ name: 'GHOST_RUNNER_SERVER_URL' | 'GHOST_RUNNER_API_URL'; value?: string }> = [
        { name: 'GHOST_RUNNER_SERVER_URL', value: process.env.GHOST_RUNNER_SERVER_URL },
        { name: 'GHOST_RUNNER_API_URL', value: process.env.GHOST_RUNNER_API_URL },
    ];

    for (const candidate of candidates) {
        const rawValue = candidate.value?.trim();
        if (!rawValue) continue;
        try {
            const parsed = new URL(rawValue);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error(`${candidate.name} must use http or https: ${rawValue}`);
            }
            parsed.pathname = '/';
            parsed.search = '';
            parsed.hash = '';
            return { url: parsed.toString(), sourceEnv: candidate.name };
        } catch (e) {
            if (e instanceof Error) throw e;
            throw new Error(`${candidate.name} is not a valid URL: ${rawValue}`);
        }
    }
    return null;
}

export async function startBackendAndUi(state: GlobalState): Promise<void> {
    const externalServer = resolveExternalServerUrl();
    if (externalServer) {
        console.log(`Using external Ghost Runner server from ${externalServer.sourceEnv}: ${externalServer.url}`);
        await waitForServerHealth(externalServer.url);
        state.uiUrl = externalServer.url;
        createMainWindow(state, externalServer.url, (rebuild) => updateTrayPresentation(state, rebuild));
        return;
    }

    const { appRoot, serverEntry } = resolveServerModuleLocation();
    configureRuntimeEnvironment(appRoot);
    const serverModule = await loadServerModule(serverEntry);

    const dataRoot = process.env.GHOST_RUNNER_DATA_DIR;
    let savedPort = 0;
    let portFilePath = '';

    if (dataRoot) {
        portFilePath = path.join(dataRoot, 'backend-port.json');
        try {
            if (fs.existsSync(portFilePath)) {
                const data = fs.readFileSync(portFilePath, 'utf8');
                const parsed = JSON.parse(data);
                if (typeof parsed.port === 'number' && parsed.port > 0) {
                    savedPort = parsed.port;
                    console.log(`Loaded saved backend port: ${savedPort}`);
                }
            }
        } catch (error) {
            console.warn('Failed to read saved backend port:', error);
        }
    }

    state.ghostServer = serverModule.createGhostServer({ port: savedPort });
    if (!state.ghostServer) {
        throw new Error('Failed to create ghost server');
    }
    state.backendPort = await state.ghostServer.start(savedPort);
    state.uiUrl = `http://127.0.0.1:${state.backendPort}`;

    if (dataRoot && state.backendPort !== savedPort) {
        try {
            if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot, { recursive: true });
            fs.writeFileSync(portFilePath, JSON.stringify({ port: state.backendPort }));
            console.log(`Saved new backend port: ${state.backendPort}`);
        } catch (error) {
            console.error('Failed to save backend port:', error);
        }
    }

    await waitForServerHealth(state.uiUrl);
    createMainWindow(state, state.uiUrl, (rebuild) => updateTrayPresentation(state, rebuild));
}

export async function shutdownBackend(state: GlobalState): Promise<void> {
    if (!state.ghostServer) return;
    try {
        await state.ghostServer.stop();
    } catch (error) {
        console.error('Failed to stop backend:', error);
    }
}
