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
import { apiClient } from '@/lib/apiClient';

/**
 * Hook to manage task metadata, running tasks status, and automation execution operations.
 */
export function useDashboardTasks(addLog: (message: string, type?: LogType) => void) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/tasks');
      setTasks(res.data.tasks || []);
    } catch {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  const runTask = useCallback(async (taskName: string) => {
    // Optimistically mark task as running for instant UI feedback
    setRunningTasks((prev) => new Set(prev).add(taskName));
    addLog(`Requesting to run task: ${taskName}...`, 'system');
    try {
      await apiClient.post('/api/run-task', { taskName });
    } catch (error) {
      // Revert running state if start request failed
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskName);
        return next;
      });
    }
  }, [addLog]);

  const recordTask = useCallback(async (taskName: string, type: 'private' | 'public') => {
    addLog(`Starting Recorder for task: ${taskName} (${type})...`, 'system');
    try {
      await apiClient.post('/api/record', { taskName, type });
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, [addLog]);

  const uploadTask = useCallback(async (taskName: string, type: 'private' | 'public', content: string) => {
    addLog(`Uploading task: ${taskName} (${type})...`, 'system');
    try {
      const res = await apiClient.post('/api/upload-task', { taskName, type, content });
      if (res.data.error) throw new Error(res.data.error);
      addLog(res.data.message || `Task ${taskName} uploaded successfully.`, 'system');
      await fetchTasks();
    } catch (error) {
      throw error;
    }
  }, [addLog, fetchTasks]);

  const loadTaskSource = useCallback(async (taskName: string) => {
    try {
      const res = await apiClient.get(`/api/tasks/${encodeURIComponent(taskName)}/source`);
      return res.data as TaskSource;
    } catch (error) {
      throw error;
    }
  }, []);

  const saveTaskSource = useCallback(async (taskName: string, type: TaskSourceSaveType, content: string) => {
    addLog(`Saving task script: ${taskName} (${type})...`, 'system');
    try {
      const res = await apiClient.post('/api/upload-task', { taskName, type, content });
      if (res.data.error) {
        throw new Error(res.data.error);
      }
      addLog(res.data.message || `Task ${taskName} saved successfully.`, 'system');
      await fetchTasks();
    } catch (error) {
      throw error;
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
