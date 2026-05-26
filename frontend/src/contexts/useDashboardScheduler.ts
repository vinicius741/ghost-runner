import { useState, useCallback, useEffect } from 'react';
import type { ScheduleItem } from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';

/**
 * Hook to manage cron schedule configurations and scheduler system state.
 */
export function useDashboardScheduler(addLog: (message: string, type?: LogType) => void) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState(false);

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
      // Quiet fail to mirror the previous behavior
    }
  }, []);

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
