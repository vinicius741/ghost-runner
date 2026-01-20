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

/**
 * Failure record from the failures API.
 * Represents a task failure with deduplication (count increments for similar errors).
 */
export interface FailureRecord {
  id: string;
  taskName: string;
  errorType: 'element_not_found' | 'navigation_failure' | 'timeout' | 'unknown';
  context: Record<string, unknown>;
  timestamp: string;
  count: number;
  lastSeen: string;
  dismissed?: boolean;
}

// Default location (São Paulo) - used to detect if user hasn't set their location
export const DEFAULT_LOCATION = { latitude: -23.55052, longitude: -46.633308 } as const;

// Dashboard card types for draggable layout
export type DashboardCardId =
  | 'controlPanel'
  | 'nextTaskTimer'
  | 'scheduleBuilder'
  | 'taskList'
  | 'logsConsole'
  | 'warningsPanel';

export type DashboardColumn = 'left' | 'right';

export interface DashboardLayout {
  version: number;
  left: DashboardCardId[];
  right: DashboardCardId[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 3,
  left: ['controlPanel', 'nextTaskTimer', 'scheduleBuilder'],
  right: ['taskList', 'warningsPanel', 'logsConsole']
} as const;
