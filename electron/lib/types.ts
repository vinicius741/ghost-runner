import type { Tray } from 'electron';

export interface GhostServerInstance {
    start: (preferredPort?: number) => Promise<number>;
    stop: () => Promise<void>;
    getPort: () => number | null;
}

export interface GhostServerModule {
    createGhostServer: (options?: { port?: number }) => GhostServerInstance;
}

export interface TaskSummary {
    name: string;
    type: 'public' | 'private' | 'root';
}

export interface ScheduleItem {
    task: string;
    cron?: string;
    executeAt?: string;
    enabled?: boolean;
}

export interface NextTaskSummary {
    task: string;
    nextRun: string;
    delayMs: number;
}

export interface SchedulerStatusResponse {
    running: boolean;
}

export interface TasksResponse {
    tasks: TaskSummary[];
}

export interface NextTaskResponse {
    nextTask: NextTaskSummary | null;
}

export interface ScheduleResponse {
    schedule: ScheduleItem[];
}

export interface ApiMessageResponse {
    message?: string;
    error?: string;
}

export interface TrayState {
    schedulerRunning: boolean | null;
    nextTask: NextTaskSummary | null;
    tasks: TaskSummary[];
    lastError: string | null;
}

export interface GlobalState {
    mainWindow: Electron.BrowserWindow | null;
    ghostServer: GhostServerInstance | null;
    backendPort: number | null;
    isShuttingDown: boolean;
    uiUrl: string | null;
    tray: Tray | null;
    trayPollTimer: NodeJS.Timeout | null;
    trayCountdownTimer: NodeJS.Timeout | null;
    trayIsRefreshing: boolean;
    trayLastAction: string | null;
    trayState: TrayState;
}
