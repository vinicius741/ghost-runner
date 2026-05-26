/* eslint-disable react-refresh/only-export-components */
/**
 * Dashboard Context
 *
 * Provides a centralized context for dashboard state management,
 * eliminating prop drilling throughout the component tree.
 *
 * @module contexts/DashboardContext
 */

import { createContext, useContext, ReactNode, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type {
  Task,
  TaskSource,
  TaskSourceSaveType,
  LogEntry,
  ScheduleItem,
  Settings,
  FailureRecord,
  InfoGatheringResult,
} from '@shared/types';
import type {
  DashboardCardId,
  DashboardLayoutExtended,
} from '@/types';
import { useDashboardLogs, type LogType } from './useDashboardLogs';
import { useDashboardLayout } from './useDashboardLayout';
import { useDashboardTasks } from './useDashboardTasks';
import { useDashboardScheduler } from './useDashboardScheduler';
import { useDashboardFailures } from './useDashboardFailures';
import { useDashboardInfoGathering } from './useDashboardInfoGathering';
import { setApiLogCallback } from '@/lib/apiClient';

/**
 * Context value interface.
 */
export interface DashboardContextValue {
  // State
  tasks: Task[];
  schedule: ScheduleItem[];
  logs: LogEntry[];
  schedulerStatus: boolean;
  settings: Settings | null;
  failures: FailureRecord[];
  infoGatheringResults: InfoGatheringResult[];
  refreshingInfoGatheringTasks: string[];
  layout: DashboardLayoutExtended;
  sidebarOpen: boolean;
  showLocationWarning: boolean;
  runningTasks: Set<string>;

  // Log operations
  addLog: (message: string, type?: LogType) => void;
  clearLogs: () => void;

  // Scheduler operations
  startScheduler: () => Promise<void>;
  stopScheduler: () => Promise<void>;

  // Task operations
  runTask: (taskName: string) => Promise<void>;
  recordTask: (taskName: string, type: 'private' | 'public') => Promise<void>;
  uploadTask: (taskName: string, type: 'private' | 'public', content: string) => Promise<void>;
  loadTaskSource: (taskName: string) => Promise<TaskSource>;
  saveTaskSource: (taskName: string, type: TaskSourceSaveType, content: string) => Promise<void>;

  // Schedule operations
  addScheduleItem: (task: string, cron?: string, executeAt?: string) => Promise<void>;
  deleteScheduleItem: (index: number) => Promise<void>;

  // Failure operations
  clearFailures: () => Promise<void>;
  dismissFailure: (id: string) => Promise<void>;

  // Info gathering operations
  refreshInfoGatheringTask: (taskName: string) => Promise<void>;
  clearInfoGatheringResult: (taskName: string) => Promise<void>;
  clearAllInfoGatheringResults: () => Promise<void>;

  // Layout operations
  handleCardReorder: (event: DragEndEvent) => void;
  minimizeCard: (cardId: DashboardCardId) => void;
  restoreCard: (cardId: DashboardCardId) => void;
  toggleSidebar: () => void;

  // Settings
  fetchSettings: () => Promise<void>;
  dismissLocationWarning: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

/**
 * Hook to access the dashboard context.
 *
 * @throws Error if used outside of DashboardProvider
 * @returns Dashboard context value
 */
export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

/**
 * Dashboard Provider Props.
 */
interface DashboardProviderProps {
  children: ReactNode;
}

/**
 * Dashboard Provider Component.
 *
 * Manages all dashboard state and provides it to children via context.
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  // 1. Logs state and functions (independent)
  const { logs, addLog, clearLogs } = useDashboardLogs();

  // Register API client logging callback
  useEffect(() => {
    setApiLogCallback(addLog);
    return () => {
      setApiLogCallback(null);
    };
  }, [addLog]);

  // 2. Specialized sub-hooks that consume the log function
  const {
    layout,
    sidebarOpen,
    settings,
    showLocationWarning,
    fetchSettings,
    handleCardReorder,
    minimizeCard,
    restoreCard,
    toggleSidebar,
    dismissLocationWarning,
  } = useDashboardLayout(addLog);

  const {
    tasks,
    runningTasks,
    runTask,
    recordTask,
    uploadTask,
    loadTaskSource,
    saveTaskSource,
  } = useDashboardTasks(addLog);

  const {
    schedule,
    schedulerStatus,
    startScheduler,
    stopScheduler,
    addScheduleItem,
    deleteScheduleItem,
  } = useDashboardScheduler(addLog);

  const {
    failures,
    clearFailures,
    dismissFailure,
  } = useDashboardFailures(addLog);

  const {
    infoGatheringResults,
    refreshingInfoGatheringTasks,
    refreshInfoGatheringTask,
    clearInfoGatheringResult,
    clearAllInfoGatheringResults,
  } = useDashboardInfoGathering(addLog);

  const value: DashboardContextValue = {
    // State
    tasks,
    schedule,
    logs,
    schedulerStatus,
    settings,
    failures,
    infoGatheringResults,
    refreshingInfoGatheringTasks,
    layout,
    sidebarOpen,
    showLocationWarning,
    runningTasks,

    // Log operations
    addLog,
    clearLogs,

    // Scheduler operations
    startScheduler,
    stopScheduler,

    // Task operations
    runTask,
    recordTask,
    uploadTask,
    loadTaskSource,
    saveTaskSource,

    // Schedule operations
    addScheduleItem,
    deleteScheduleItem,

    // Failure operations
    clearFailures,
    dismissFailure,

    // Info gathering operations
    refreshInfoGatheringTask,
    clearInfoGatheringResult,
    clearAllInfoGatheringResults,

    // Layout operations
    handleCardReorder,
    minimizeCard,
    restoreCard,
    toggleSidebar,

    // Settings
    fetchSettings,
    dismissLocationWarning,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
