import { app, Tray, Menu, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { TRAY_ICON_HEIGHT_PX, TRAY_POLL_INTERVAL_MS, TRAY_COUNTDOWN_INTERVAL_MS, ONE_TIME_TRAY_DELAY_MS } from './constants';
import { GlobalState, TaskSummary, SchedulerStatusResponse, NextTaskResponse, TasksResponse, ApiMessageResponse, ScheduleResponse, NextTaskSummary } from './types';
import { resolveTrayIconPath } from './paths';
import { requestBackend } from './network';
import { toggleMainWindow, showMainWindow } from './window';

export function createTrayIcon() {
    const iconPath = resolveTrayIconPath();
    if (iconPath) {
        let icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            if (process.platform === 'darwin') {
                icon = icon.resize({ height: TRAY_ICON_HEIGHT_PX, quality: 'best' });
                icon.setTemplateImage(true);
            }
            return icon;
        }
    }
    return nativeImage.createEmpty();
}

export function formatTaskLabel(task: TaskSummary): string {
    if (task.type === 'private') return `${task.name} [private]`;
    if (task.type === 'root') return `${task.name} [root]`;
    return task.name;
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

export function getNextTaskDelayMs(nextTask: NextTaskSummary | null): number | null {
    if (!nextTask) return null;
    const timestamp = Date.parse(nextTask.nextRun);
    if (Number.isNaN(timestamp)) return null;
    return timestamp - Date.now();
}

export function buildNextTaskLabel(state: GlobalState): string {
    if (!state.trayState.nextTask) return 'No upcoming automation';
    const delayMs = getNextTaskDelayMs(state.trayState.nextTask);
    if (delayMs === null) return `${state.trayState.nextTask.task} (invalid time)`;
    if (delayMs <= 0) return `${state.trayState.nextTask.task} (due now)`;
    return `${state.trayState.nextTask.task} in ${formatDuration(delayMs)}`;
}

export function updateTrayPresentation(state: GlobalState, rebuildMenu = true): void {
    if (!state.tray) return;

    state.tray.setToolTip(`Ghost Runner (${state.trayState.schedulerRunning ? 'running' : 'stopped'}) - ${buildNextTaskLabel(state)}`);
    if (process.platform === 'darwin') {
        const delayMs = getNextTaskDelayMs(state.trayState.nextTask);
        state.tray.setTitle(delayMs !== null ? `Next ${formatDuration(delayMs)}` : '');
    }

    if (!rebuildMenu) return;

    const schedulerStatus = state.trayState.schedulerRunning === null ? 'Unknown' : state.trayState.schedulerRunning ? 'Running' : 'Stopped';
    const sortedTasks = [...state.trayState.tasks].sort((a, b) => a.name.localeCompare(b.name));

    const runNowMenu: MenuItemConstructorOptions[] = sortedTasks.length > 0
        ? sortedTasks.map((task) => ({ label: formatTaskLabel(task), click: () => void runTaskFromTray(state, task.name) }))
        : [{ label: 'No tasks available', enabled: false }];

    const queueOnceMenu: MenuItemConstructorOptions[] = sortedTasks.length > 0
        ? sortedTasks.map((task) => ({ label: formatTaskLabel(task), click: () => void queueTaskOnceFromTray(state, task.name) }))
        : [{ label: 'No tasks available', enabled: false }];

    const template: MenuItemConstructorOptions[] = [
        { label: 'Open Ghost Runner', click: () => showMainWindow(state, (rebuild) => updateTrayPresentation(state, rebuild)) },
        { label: state.mainWindow?.isVisible() ? 'Hide Window' : 'Show Window', click: () => toggleMainWindow(state, (rebuild) => updateTrayPresentation(state, rebuild)) },
        { type: 'separator' },
        { label: `Scheduler: ${schedulerStatus}`, enabled: false },
        { label: state.trayState.schedulerRunning ? 'Stop Scheduler' : 'Start Scheduler', click: () => void toggleSchedulerFromTray(state) },
        { type: 'separator' },
        { label: `Next: ${buildNextTaskLabel(state)}`, enabled: false },
        { label: 'Run Automation Now', submenu: runNowMenu },
        { label: 'Schedule Once (Run Next)', submenu: queueOnceMenu },
        { type: 'separator' },
        { label: 'Refresh Tray State', click: () => void refreshTrayState(state) },
    ];

    if (state.trayLastAction) template.push({ label: `Last action: ${state.trayLastAction}`, enabled: false });
    if (state.trayState.lastError) template.push({ label: `Error: ${state.trayState.lastError}`, enabled: false });

    template.push({ type: 'separator' }, { label: 'Quit Ghost Runner', click: () => app.quit() });
    state.tray.setContextMenu(Menu.buildFromTemplate(template));
}

export async function refreshTrayState(state: GlobalState): Promise<void> {
    if (!state.tray || !state.uiUrl || state.trayIsRefreshing) return;
    // Note: Since this is JS (single threaded), checking and setting this flag is effectively atomic
    // as no other synchronous code can execute between these lines.
    state.trayIsRefreshing = true;
    try {
        const [statusResponse, nextTaskResponse, tasksResponse] = await Promise.all([
            requestBackend<SchedulerStatusResponse>(state.uiUrl, '/api/scheduler/status'),
            requestBackend<NextTaskResponse>(state.uiUrl, '/api/scheduler/next-task'),
            requestBackend<TasksResponse>(state.uiUrl, '/api/tasks'),
        ]);
        state.trayState.schedulerRunning = statusResponse.running;
        state.trayState.nextTask = nextTaskResponse.nextTask;
        state.trayState.tasks = Array.isArray(tasksResponse.tasks) ? tasksResponse.tasks : [];
        state.trayState.lastError = null;
    } catch (error) {
        state.trayState.lastError = error instanceof Error ? error.message : String(error);
    } finally {
        state.trayIsRefreshing = false;
        updateTrayPresentation(state, true);
    }
}

async function toggleSchedulerFromTray(state: GlobalState): Promise<void> {
    try {
        const shouldStart = state.trayState.schedulerRunning !== true;
        const endpoint = shouldStart ? '/api/scheduler/start' : '/api/scheduler/stop';
        const response = await requestBackend<ApiMessageResponse>(state.uiUrl, endpoint, { method: 'POST' });
        state.trayLastAction = response.message || (shouldStart ? 'Scheduler started.' : 'Scheduler stopped.');
        state.trayState.lastError = null;
    } catch (error) {
        state.trayState.lastError = error instanceof Error ? error.message : String(error);
    } finally {
        await refreshTrayState(state);
    }
}

async function runTaskFromTray(state: GlobalState, taskName: string): Promise<void> {
    try {
        const response = await requestBackend<ApiMessageResponse>(state.uiUrl, '/api/tasks/run', {
            method: 'POST',
            body: JSON.stringify({ taskName }),
        });
        state.trayLastAction = response.message || `Task '${taskName}' started.`;
        state.trayState.lastError = null;
    } catch (error) {
        state.trayState.lastError = error instanceof Error ? error.message : String(error);
    } finally {
        await refreshTrayState(state);
    }
}

async function queueTaskOnceFromTray(state: GlobalState, taskName: string): Promise<void> {
    try {
        const currentSchedule = await requestBackend<ScheduleResponse>(state.uiUrl, '/api/schedule');
        const executeAt = new Date(Date.now() + ONE_TIME_TRAY_DELAY_MS).toISOString();
        const nextSchedule = [...(currentSchedule.schedule || []), { task: taskName, executeAt }];
        const response = await requestBackend<ApiMessageResponse>(state.uiUrl, '/api/schedule', {
            method: 'POST',
            body: JSON.stringify({ schedule: nextSchedule }),
        });
        state.trayLastAction = response.message || `Scheduled '${taskName}' once.`;
        state.trayState.lastError = null;
    } catch (error) {
        state.trayState.lastError = error instanceof Error ? error.message : String(error);
    } finally {
        await refreshTrayState(state);
    }
}

export function startTrayTimers(state: GlobalState): void {
    state.trayPollTimer = setInterval(() => {
        refreshTrayState(state).catch((err) => console.error('Tray poll error:', err));
    }, TRAY_POLL_INTERVAL_MS);
    state.trayCountdownTimer = setInterval(() => updateTrayPresentation(state, false), TRAY_COUNTDOWN_INTERVAL_MS);
}

export function destroyTray(state: GlobalState): void {
    if (state.trayPollTimer) clearInterval(state.trayPollTimer);
    if (state.trayCountdownTimer) clearInterval(state.trayCountdownTimer);
    if (state.tray) {
        state.tray.destroy();
        state.tray = null;
    }
}

export function initializeTray(state: GlobalState): void {
    if (state.tray) return;
    state.tray = new Tray(createTrayIcon());
    state.tray.on('click', () => toggleMainWindow(state, (rebuild) => updateTrayPresentation(state, rebuild)));
    updateTrayPresentation(state, true);
    startTrayTimers(state);
    void refreshTrayState(state);
}
