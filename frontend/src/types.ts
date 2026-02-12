// Re-export shared types
export type {
  Task,
  LogEntry,
  ScheduleItem,
  Settings,
  GeolocationSettings,
  FailureRecord,
  InfoGatheringResult,
  NextTask,
} from '@shared/types';

export { DEFAULT_LOCATION } from '@shared/types';

// Dashboard card types for draggable layout
export type DashboardCardId =
  | 'controlPanel'
  | 'nextTaskTimer'
  | 'scheduleBuilder'
  | 'taskList'
  | 'logsConsole'
  | 'warningsPanel'
  | 'infoGathering';

export type DashboardColumn = 'left' | 'right';

export interface DashboardLayout {
  version: number;
  left: DashboardCardId[];
  right: DashboardCardId[];
}

export interface MinimizedCard {
  id: DashboardCardId;
  column: DashboardColumn;
  index: number;
}

export interface DashboardLayoutExtended extends DashboardLayout {
  minimized: MinimizedCard[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutExtended = {
  version: 5,
  left: ['controlPanel', 'nextTaskTimer', 'scheduleBuilder'],
  right: ['taskList', 'warningsPanel', 'infoGathering', 'logsConsole'],
  minimized: []
} as const;

export const CARD_METADATA: Record<DashboardCardId, {
  displayName: string;
}> = {
  controlPanel: { displayName: 'Controls' },
  taskList: { displayName: 'Tasks' },
  scheduleBuilder: { displayName: 'Schedule' },
  logsConsole: { displayName: 'Logs' },
  warningsPanel: { displayName: 'Failures' },
  nextTaskTimer: { displayName: 'Timer' },
  infoGathering: { displayName: 'Info Gather' },
} as const;
