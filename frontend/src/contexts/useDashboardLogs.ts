import { useState, useCallback, useEffect } from 'react';
import type { LogEntry } from '@shared/types';
import { getSocket } from './dashboardSocket';

export type LogType = 'normal' | 'error' | 'system';

/**
 * The server sends plain strings and marks severity inside the text, e.g.
 * "[Scheduler ERROR] …", "[Task: x SYSTEM ERROR] …", "[SYSTEM CRASH] …".
 */
export function classifySocketLog(message: string): LogType {
  if (/^\[[^\]]*\bERROR\]|^\[SYSTEM CRASH\]/.test(message)) return 'error';
  if (/^\[(System|Scheduler)\]/.test(message)) return 'system';
  return 'normal';
}

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
      addLog(message, classifySocketLog(message));
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
