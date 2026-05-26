import { useState, useCallback, useEffect } from 'react';
import type { InfoGatheringResult } from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';

/**
 * Hook to manage background scraping/info gathering states, results, and operations.
 */
export function useDashboardInfoGathering(addLog: (message: string, type?: LogType) => void) {
  const [infoGatheringResults, setInfoGatheringResults] = useState<InfoGatheringResult[]>([]);
  const [refreshingInfoGatheringTasks, setRefreshingInfoGatheringTasks] = useState<string[]>([]);

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

  // Set up socket event listeners and initial fetch
  useEffect(() => {
    fetchInfoGathering();

    const socket = getSocket();

    const handleInfoDataUpdated = (payload: { result: InfoGatheringResult }) => {
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
    };

    const handleInfoGatheringResultCleared = (payload: { taskName: string }) => {
      setInfoGatheringResults((prev) => prev.filter((r) => r.taskName !== payload.taskName));
      addLog(`Information cleared: ${payload.taskName}`, 'system');
    };

    const handleInfoGatheringAllCleared = () => {
      setInfoGatheringResults([]);
      addLog('All information cleared', 'system');
    };

    socket.on('info-data-updated', handleInfoDataUpdated);
    socket.on('info-gathering-result-cleared', handleInfoGatheringResultCleared);
    socket.on('info-gathering-all-cleared', handleInfoGatheringAllCleared);

    return () => {
      socket.off('info-data-updated', handleInfoDataUpdated);
      socket.off('info-gathering-result-cleared', handleInfoGatheringResultCleared);
      socket.off('info-gathering-all-cleared', handleInfoGatheringAllCleared);
    };
  }, [fetchInfoGathering, addLog]);

  return {
    infoGatheringResults,
    refreshingInfoGatheringTasks,
    refreshInfoGatheringTask,
    clearInfoGatheringResult,
    clearAllInfoGatheringResults,
  };
}
