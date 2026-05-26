import { useState, useCallback, useEffect } from 'react';
import type {
  Task,
  TaskSource,
  TaskSourceSaveType,
  TaskStartedPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
} from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';

/**
 * Hook to manage task metadata, running tasks status, and automation execution operations.
 */
export function useDashboardTasks(addLog: (message: string, type?: LogType) => void) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      addLog('Error fetching tasks', 'error');
    }
  }, [addLog]);

  const runTask = useCallback(async (taskName: string) => {
    // Optimistically mark task as running for instant UI feedback
    setRunningTasks((prev) => new Set(prev).add(taskName));
    addLog(`Requesting to run task: ${taskName}...`, 'system');
    try {
      await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName }),
      });
    } catch (error) {
      // Revert running state if start request failed
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskName);
        return next;
      });
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

  const uploadTask = useCallback(async (taskName: string, type: 'private' | 'public', content: string) => {
    addLog(`Uploading task: ${taskName} (${type})...`, 'system');
    try {
      const res = await fetch('/api/upload-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName, type, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed with HTTP ${res.status}`);
      }
      if (data.error) throw new Error(data.error);
      addLog(data.message || `Task ${taskName} uploaded successfully.`, 'system');
      await fetchTasks();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error uploading task: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }
  }, [addLog, fetchTasks]);

  const loadTaskSource = useCallback(async (taskName: string) => {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskName)}/source`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Failed to load task source with HTTP ${res.status}`);
      }
      return data as TaskSource;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error loading task source: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }
  }, [addLog]);

  const saveTaskSource = useCallback(async (taskName: string, type: TaskSourceSaveType, content: string) => {
    addLog(`Saving task script: ${taskName} (${type})...`, 'system');
    try {
      const res = await fetch('/api/upload-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName, type, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Save failed with HTTP ${res.status}`);
      }
      if (data.error) {
        throw new Error(data.error);
      }
      addLog(data.message || `Task ${taskName} saved successfully.`, 'system');
      await fetchTasks();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error saving task script: ${message}`, 'error');
      throw error instanceof Error ? error : new Error(message);
    }
  }, [addLog, fetchTasks]);

  // Set up socket listeners for task lifecycle events
  useEffect(() => {
    fetchTasks();

    const socket = getSocket();

    const handleTaskStarted = (payload: TaskStartedPayload) => {
      setRunningTasks((prev) => new Set(prev).add(payload.taskName));
    };

    const handleTaskCompleted = (payload: TaskCompletedPayload) => {
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(payload.taskName);
        return next;
      });
    };

    const handleTaskFailed = (payload: TaskFailedPayload) => {
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(payload.taskName);
        return next;
      });
    };

    socket.on('task-started', handleTaskStarted);
    socket.on('task-completed', handleTaskCompleted);
    socket.on('task-failed', handleTaskFailed);

    return () => {
      socket.off('task-started', handleTaskStarted);
      socket.off('task-completed', handleTaskCompleted);
      socket.off('task-failed', handleTaskFailed);
    };
  }, [fetchTasks]);

  return {
    tasks,
    runningTasks,
    runTask,
    recordTask,
    uploadTask,
    loadTaskSource,
    saveTaskSource,
  };
}
