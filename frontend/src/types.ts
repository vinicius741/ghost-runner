export interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

export interface LogEntry {
  message: string;
  timestamp: string;
  type: 'normal' | 'error' | 'system';
}

export interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

export interface GeolocationSettings {
  latitude: number;
  longitude: number;
}

export interface Settings {
  geolocation: GeolocationSettings;
}

// Default location (São Paulo) - used to detect if user hasn't set their location
export const DEFAULT_LOCATION = { latitude: -23.55052, longitude: -46.633308 } as const;

// Dashboard card types for draggable layout
export type DashboardCardId =
  | 'controlPanel'
  | 'nextTaskTimer'
  | 'scheduleBuilder'
  | 'taskList'
  | 'logsConsole';

export type DashboardColumn = 'left' | 'right';

export interface DashboardLayout {
  version: number;
  left: DashboardCardId[];
  right: DashboardCardId[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 2,
  left: ['controlPanel', 'nextTaskTimer', 'scheduleBuilder'],
  right: ['taskList', 'logsConsole']
} as const;
