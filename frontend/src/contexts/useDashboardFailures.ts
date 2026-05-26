import { useState, useCallback, useEffect } from 'react';
import type { FailureRecord } from '@shared/types';
import { getSocket } from './dashboardSocket';
import type { LogType } from './useDashboardLogs';
import { apiClient } from '@/lib/apiClient';

/**
 * Hook to manage task failure records state and actions.
 */
export function useDashboardFailures(addLog: (message: string, type?: LogType) => void) {
  const [failures, setFailures] = useState<FailureRecord[]>([]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/failures');
      setFailures(res.data.failures || []);
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  const clearFailures = useCallback(async () => {
    try {
      const res = await apiClient.delete('/api/failures');
      if (res.data.error) throw new Error(res.data.error);
      setFailures([]);
      addLog('All failures cleared', 'system');
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, [addLog]);

  const dismissFailure = useCallback(async (id: string) => {
    try {
      const res = await apiClient.post(`/api/failures/${id}/dismiss`);
      if (res.data.error) throw new Error(res.data.error);
      setFailures((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  // Set up socket event listeners and initial fetch
  useEffect(() => {
    fetchFailures();

    const socket = getSocket();

    const handleFailureRecorded = (failure: FailureRecord) => {
      setFailures((prev) => [...prev, failure]);
      addLog(`Task failure recorded: ${failure.taskName}`, 'error');
    };

    const handleFailuresCleared = () => {
      setFailures([]);
      addLog('All failures cleared', 'system');
    };

    const handleFailureDismissed = (id: string) => {
      setFailures((prev) => prev.filter((f) => f.id !== id));
    };

    socket.on('failure-recorded', handleFailureRecorded);
    socket.on('failures-cleared', handleFailuresCleared);
    socket.on('failure-dismissed', handleFailureDismissed);

    return () => {
      socket.off('failure-recorded', handleFailureRecorded);
      socket.off('failures-cleared', handleFailuresCleared);
      socket.off('failure-dismissed', handleFailureDismissed);
    };
  }, [fetchFailures, addLog]);

  return {
    failures,
    clearFailures,
    dismissFailure,
  };
}
