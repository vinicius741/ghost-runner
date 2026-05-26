import { useState, useCallback, useEffect } from 'react';
import type { ScheduleItem } from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';
import { apiClient } from '@/lib/apiClient';

/**
 * Hook to manage cron schedule configurations and scheduler system state.
 */
export function useDashboardScheduler(addLog: (message: string, type?: LogType) => void) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/schedule');
      setSchedule(res.data.schedule || []);
    } catch {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/scheduler/status');
      setSchedulerStatus(res.data.running);
    } catch {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  const saveScheduleToServer = useCallback(async (newSchedule: ScheduleItem[]) => {
    try {
      const res = await apiClient.post('/api/schedule', { schedule: newSchedule });
      if (res.data.error) throw new Error(res.data.error);
      addLog('Schedule updated successfully.', 'system');
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  }, [addLog]);

  const startScheduler = useCallback(async () => {
    addLog('Starting Scheduler...', 'system');
    try {
      const res = await apiClient.post('/api/scheduler/start');
      addLog(res.data.message, 'system');
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, [addLog]);

  const stopScheduler = useCallback(async () => {
    addLog('Stopping Scheduler...', 'system');
    try {
      const res = await apiClient.post('/api/scheduler/stop');
      addLog(res.data.message, 'system');
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, [addLog]);

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

  // Set up socket listeners and initial fetches
  useEffect(() => {
    fetchSchedule();
    fetchSchedulerStatus();

    const socket = getSocket();

    const handleSchedulerStatus = (status: { running: boolean }) => {
      setSchedulerStatus(status.running);
    };

    const handleScheduleUpdated = (payload: { schedule?: ScheduleItem[] }) => {
      setSchedule(Array.isArray(payload.schedule) ? payload.schedule : []);
    };

    socket.on('scheduler-status', handleSchedulerStatus);
    socket.on('schedule-updated', handleScheduleUpdated);

    return () => {
      socket.off('scheduler-status', handleSchedulerStatus);
      socket.off('schedule-updated', handleScheduleUpdated);
    };
  }, [fetchSchedule, fetchSchedulerStatus]);

  return {
    schedule,
    schedulerStatus,
    startScheduler,
    stopScheduler,
    addScheduleItem,
    deleteScheduleItem,
  };
}
