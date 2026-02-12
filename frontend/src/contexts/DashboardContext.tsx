/**
 * Dashboard Context
 *
 * Provides a centralized context for dashboard state management,
 * eliminating prop drilling throughout the component tree.
 *
 * @module contexts/DashboardContext
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type {
  Task,
  LogEntry,
  ScheduleItem,
  Settings,
  FailureRecord,
  InfoGatheringResult,
} from '@shared/types';
import { DEFAULT_LOCATION } from '@shared/types';
import type {
  DashboardCardId,
  DashboardLayoutExtended,
  DashboardColumn,
  MinimizedCard,
} from '@/types';
import { getStoredLayout, saveLayout, getSidebarState, saveSidebarState, StoredLayoutResult } from '@/lib/dashboardLayout';

/**
 * Log type for the addLog function.
 */
type LogType = 'normal' | 'error' | 'system';

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

  // Log operations
  addLog: (message: string, type?: LogType) => void;
  clearLogs: () => void;

  // Scheduler operations
  startScheduler: () => Promise<void>;
  stopScheduler: () => Promise<void>;

  // Task operations
  runTask: (taskName: string) => Promise<void>;
  recordTask: (taskName: string, type: 'private' | 'public') => Promise<void>;

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
 * Socket instance (singleton).
 */
let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io();
  }
  return socketInstance;
}

/**
 * Dashboard Provider Component.
 *
 * Manages all dashboard state and provides it to children via context.
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  // Initialize layout and handle migration message
  const initialLayoutResult: StoredLayoutResult = getStoredLayout();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failures, setFailures] = useState<FailureRecord[]>([]);
  const [infoGatheringResults, setInfoGatheringResults] = useState<InfoGatheringResult[]>([]);
  const [refreshingInfoGatheringTasks, setRefreshingInfoGatheringTasks] = useState<string[]>([]);
  const [layout, setLayout] = useState<DashboardLayoutExtended>(() => initialLayoutResult.layout);
  const [sidebarOpen, setSidebarOpen] = useState(() => getSidebarState());
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);

  // Migration message ref
  const migrationMessageShownRef = useRef(false);

  // Socket ref
  const socketRef = useRef<Socket | null>(null);

  // Log operations
  const addLog = useCallback((message: string, type: LogType = 'normal') => {
    setLogs((prev) => [...prev, {
      message,
      timestamp: new Date().toLocaleTimeString(),
      type,
    }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Fetch functions
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      addLog('Error fetching tasks', 'error');
    }
  }, [addLog]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch {
      addLog('Error fetching schedule', 'error');
    }
  }, [addLog]);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const data = await res.json();
      setSchedulerStatus(data.running);
    } catch {
      // Quiet fail
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings && data.settings.geolocation) {
        setSettings(data.settings);
      }
    } catch (error) {
      addLog('Error fetching settings', 'error');
      console.error('Error fetching settings:', error);
    }
  }, [addLog]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch('/api/failures');
      const data = await res.json();
      setFailures(data.failures || []);
    } catch (error) {
      addLog('Error fetching failures', 'error');
      console.error('Error fetching failures:', error);
    }
  }, [addLog]);

  const fetchInfoGathering = useCallback(async () => {
    try {
      const res = await fetch('/api/info-gathering');
      const data = await res.json();
      setInfoGatheringResults(data.results || []);
    } catch (error) {
      addLog('Error fetching info-gathering data', 'error');
      console.error('Error fetching info-gathering data:', error);
    }
  }, [addLog]);

  // Save schedule helper
  const saveScheduleToServer = useCallback(async (newSchedule: ScheduleItem[]) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: newSchedule }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addLog('Schedule updated successfully.', 'system');
    } catch (error) {
      console.error('Error saving schedule:', error);
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error saving schedule: ${message}`, 'error');
    }
  }, [addLog]);

  // Scheduler operations
  const startScheduler = useCallback(async () => {
    addLog('Starting Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/start', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting scheduler: ${message}`, 'error');
    }
  }, [addLog]);

  const stopScheduler = useCallback(async () => {
    addLog('Stopping Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/stop', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error stopping scheduler: ${message}`, 'error');
    }
  }, [addLog]);

  // Task operations
  const runTask = useCallback(async (taskName: string) => {
    addLog(`Requesting to run task: ${taskName}...`, 'system');
    try {
      await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting task: ${message}`, 'error');
    }
  }, [addLog]);

  const recordTask = useCallback(async (taskName: string, type: 'private' | 'public') => {
    addLog(`Starting Recorder for task: ${taskName} (${type})...`, 'system');
    try {
      await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName, type }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting recorder: ${message}`, 'error');
    }
  }, [addLog]);

  // Schedule operations
  const addScheduleItem = useCallback(async (task: string, cron?: string, executeAt?: string) => {
    const newItem: ScheduleItem = { task };
    if (cron) newItem.cron = cron;
    if (executeAt) newItem.executeAt = executeAt;

    const newSchedule = [...schedule, newItem];
    setSchedule(newSchedule);
    await saveScheduleToServer(newSchedule);
  }, [schedule, saveScheduleToServer]);

  const deleteScheduleItem = useCallback(async (index: number) => {
    const newSchedule = [...schedule];
    newSchedule.splice(index, 1);
    setSchedule(newSchedule);
    await saveScheduleToServer(newSchedule);
  }, [schedule, saveScheduleToServer]);

  // Failure operations
  const clearFailures = useCallback(async () => {
    try {
      const res = await fetch('/api/failures', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures([]);
      addLog('All failures cleared', 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing failures: ${message}`, 'error');
    }
  }, [addLog]);

  const dismissFailure = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/failures/${id}/dismiss`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error dismissing failure: ${message}`, 'error');
    }
  }, [addLog]);

  // Info gathering operations
  const refreshInfoGatheringTask = useCallback(async (taskName: string) => {
    setRefreshingInfoGatheringTasks((prev) => [...prev, taskName]);
    addLog(`Refreshing information: ${taskName}...`, 'system');
    try {
      await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error refreshing task: ${message}`, 'error');
    } finally {
      setRefreshingInfoGatheringTasks((prev) => prev.filter((t) => t !== taskName));
    }
  }, [addLog]);

  const clearInfoGatheringResult = useCallback(async (taskName: string) => {
    try {
      const res = await fetch(`/api/info-gathering/${taskName}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfoGatheringResults((prev) => prev.filter((r) => r.taskName !== taskName));
      addLog(`Information cleared: ${taskName}`, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing result: ${message}`, 'error');
    }
  }, [addLog]);

  const clearAllInfoGatheringResults = useCallback(async () => {
    try {
      const res = await fetch('/api/info-gathering', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfoGatheringResults([]);
      addLog('All information cleared', 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing results: ${message}`, 'error');
    }
  }, [addLog]);

  // Layout operations
  const handleCardReorder = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as DashboardCardId;
    const overId = over.id as DashboardCardId;

    setLayout((currentLayout) => {
      const activeColumn: DashboardColumn = currentLayout.left.includes(activeId) ? 'left' : 'right';
      const overColumn: DashboardColumn = currentLayout.left.includes(overId) ? 'left' : 'right';

      const sourceArray = currentLayout[activeColumn];
      const targetArray = currentLayout[overColumn];

      const oldIndex = sourceArray.indexOf(activeId);
      const newIndex = targetArray.indexOf(overId);

      let newLayout: DashboardLayoutExtended;

      if (activeColumn === overColumn) {
        const newArray = arrayMove(sourceArray, oldIndex, newIndex);
        newLayout = { ...currentLayout, [activeColumn]: newArray };
      } else {
        const newSourceArray = [...sourceArray];
        const newTargetArray = [...targetArray];
        newSourceArray.splice(oldIndex, 1);
        newTargetArray.splice(newIndex, 0, activeId);
        newLayout = {
          ...currentLayout,
          [activeColumn]: newSourceArray,
          [overColumn]: newTargetArray,
        };
      }

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const minimizeCard = useCallback((cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      let sourceColumn: DashboardColumn | null = null;
      let sourceIndex = -1;

      if (currentLayout.left.includes(cardId)) {
        sourceColumn = 'left';
        sourceIndex = currentLayout.left.indexOf(cardId);
      } else if (currentLayout.right.includes(cardId)) {
        sourceColumn = 'right';
        sourceIndex = currentLayout.right.indexOf(cardId);
      }

      if (!sourceColumn || sourceIndex === -1) {
        return currentLayout;
      }

      const minimizedCard: MinimizedCard = {
        id: cardId,
        column: sourceColumn,
        index: sourceIndex,
      };

      const newColumnArray = [...currentLayout[sourceColumn]];
      newColumnArray.splice(sourceIndex, 1);

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [sourceColumn]: newColumnArray,
        minimized: [...currentLayout.minimized, minimizedCard],
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const restoreCard = useCallback((cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      const minimizedCardIndex = currentLayout.minimized.findIndex((m) => m.id === cardId);
      if (minimizedCardIndex === -1) {
        return currentLayout;
      }

      const minimizedCard = currentLayout.minimized[minimizedCardIndex];
      const targetColumn = minimizedCard.column;

      const newMinimized = [...currentLayout.minimized];
      newMinimized.splice(minimizedCardIndex, 1);

      const newColumnArray = [...currentLayout[targetColumn], cardId];

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [targetColumn]: newColumnArray,
        minimized: newMinimized,
      };

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const newState = !prev;
      saveSidebarState(newState);
      return newState;
    });
  }, []);

  const dismissLocationWarning = useCallback(() => {
    setLocationWarningDismissed(true);
  }, []);

  // Socket.io setup
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Show migration message if one exists
    if (!migrationMessageShownRef.current && initialLayoutResult.migrationMessage) {
      addLog(initialLayoutResult.migrationMessage, 'system');
      migrationMessageShownRef.current = true;
    }

    // Initial fetches
    fetchTasks();
    fetchSchedule();
    fetchSchedulerStatus();
    fetchSettings();
    fetchFailures();
    fetchInfoGathering();

    // Socket event handlers
    socket.on('log', (message: string) => {
      addLog(message);
    });

    socket.on('scheduler-status', (status: { running: boolean }) => {
      setSchedulerStatus(status.running);
    });

    socket.on('schedule-updated', (payload: { schedule?: ScheduleItem[] }) => {
      setSchedule(Array.isArray(payload.schedule) ? payload.schedule : []);
    });

    socket.on('failure-recorded', (failure: FailureRecord) => {
      setFailures((prev) => [...prev, failure]);
      addLog(`Task failure recorded: ${failure.taskName}`, 'error');
    });

    socket.on('failures-cleared', () => {
      setFailures([]);
      addLog('All failures cleared', 'system');
    });

    socket.on('failure-dismissed', (id: string) => {
      setFailures((prev) => prev.filter((f) => f.id !== id));
    });

    socket.on('info-data-updated', (payload: { result: InfoGatheringResult }) => {
      setInfoGatheringResults((prev) => {
        const existing = prev.findIndex((r) => r.taskName === payload.result.taskName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = payload.result;
          return updated;
        }
        return [...prev, payload.result];
      });
      addLog(`Information updated: ${payload.result.displayName}`, 'system');
    });

    socket.on('info-gathering-result-cleared', (payload: { taskName: string }) => {
      setInfoGatheringResults((prev) => prev.filter((r) => r.taskName !== payload.taskName));
      addLog(`Information cleared: ${payload.taskName}`, 'system');
    });

    socket.on('info-gathering-all-cleared', () => {
      setInfoGatheringResults([]);
      addLog('All information cleared', 'system');
    });

    return () => {
      socket.off('log');
      socket.off('scheduler-status');
      socket.off('schedule-updated');
      socket.off('failure-recorded');
      socket.off('failures-cleared');
      socket.off('failure-dismissed');
      socket.off('info-data-updated');
      socket.off('info-gathering-result-cleared');
      socket.off('info-gathering-all-cleared');
    };
  }, [addLog, fetchTasks, fetchSchedule, fetchSchedulerStatus, fetchSettings, fetchFailures, fetchInfoGathering, initialLayoutResult.migrationMessage]);

  // Location warning
  const isUsingDefaultLocation = Boolean(
    settings?.geolocation &&
    settings.geolocation.latitude === DEFAULT_LOCATION.latitude &&
    settings.geolocation.longitude === DEFAULT_LOCATION.longitude
  );

  const showLocationWarning = isUsingDefaultLocation && !locationWarningDismissed;

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

    // Log operations
    addLog,
    clearLogs,

    // Scheduler operations
    startScheduler,
    stopScheduler,

    // Task operations
    runTask,
    recordTask,

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
