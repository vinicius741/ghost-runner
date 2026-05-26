import { useState, useCallback, useEffect } from 'react';
import type { LogEntry } from '@shared/types';
import { getSocket } from './dashboardSocket';

export type LogType = 'normal' | 'error' | 'system';

/**
 * Hook to manage dashboard logs state, socket connection, and operations.
 */
export function useDashboardLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: LogType = 'normal') => {
    setLogs((prev) => [
      ...prev,
      {
        message,
        timestamp: new Date().toLocaleTimeString(),
        type,
      },
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Listen to live logs from the socket
  useEffect(() => {
    const socket = getSocket();
    const handleLog = (message: string) => {
      addLog(message);
    };

    socket.on('log', handleLog);
    return () => {
      socket.off('log', handleLog);
    };
  }, [addLog]);

  return {
    logs,
    addLog,
    clearLogs,
  };
}
