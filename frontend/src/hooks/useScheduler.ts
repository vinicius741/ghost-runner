/**
 * Scheduler Hook for Ghost Runner Frontend
 *
 * This hook provides scheduler control with optimistic updates and
 * real-time status synchronization via Socket.io.
 * Extracted from App.tsx for reusability across components.
 *
 * Related: Development Execution Plan Task 1.3.3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Scheduler status states.
 */
export type SchedulerStatus = 'running' | 'stopped' | 'unknown';

/**
 * Return type for the useScheduler hook.
 * Provides scheduler control with optimistic updates.
 */
export interface UseSchedulerResult {
  /** Current scheduler status */
  status: SchedulerStatus;
  /** Start the scheduler */
  start: () => Promise<void>;
  /** Stop the scheduler */
  stop: () => Promise<void>;
  /** Refresh scheduler status */
  refresh: () => Promise<void>;
  /** Loading state for operations */
  loading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Options for configuring the useScheduler hook behavior.
 */
export interface UseSchedulerOptions {
  /** Callback called on successful start */
  onStart?: () => void;
  /** Callback called on successful stop */
  onStop?: () => void;
  /** Callback called on status change */
  onStatusChange?: (status: SchedulerStatus) => void;
  /** Callback called on error */
  onError?: (error: string) => void;
  /** Enable optimistic updates (default: true) */
  optimisticUpdates?: boolean;
}

/**
 * API response for scheduler status endpoint.
 */
interface SchedulerStatusResponse {
  running: boolean;
}

/**
 * API response for scheduler action endpoints.
 */
interface SchedulerActionResponse {
  message: string;
  error?: string;
}

/**
 * Convert boolean running status to SchedulerStatus type.
 */
function runningToStatus(running: boolean | null): SchedulerStatus {
  if (running === null) return 'unknown';
  return running ? 'running' : 'stopped';
}

/**
 * Scheduler hook with optimistic updates and real-time synchronization.
 *
 * This hook manages the scheduler state and provides methods to control it.
 * It uses optimistic updates to provide immediate feedback, and automatically
 * syncs with the server via Socket.io for real-time status updates.
 *
 * @param options - Optional configuration for the hook
 * @returns Scheduler control object with state and methods
 *
 * @example
 * const { status, start, stop, refresh, loading, error } = useScheduler({
 *   onStatusChange: (status) => console.log('Status:', status),
 * });
 *
 * @example
 * // With optimistic updates disabled (wait for server confirmation)
 * const { start } = useScheduler({ optimisticUpdates: false });
 */
export function useScheduler(options: UseSchedulerOptions = {}): UseSchedulerResult {
  const {
    onStart,
    onStop,
    onStatusChange,
    onError,
    optimisticUpdates = true,
  } = options;

  const { socket, connected } = useSocket();
  const [status, setStatus] = useState<SchedulerStatus>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pending operations to prevent duplicate calls
  const pendingOperationRef = useRef<'start' | 'stop' | null>(null);

  // AbortController for cancelling pending requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Fetch the current scheduler status from the server.
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Cancel any pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/scheduler/status', {
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as SchedulerStatusResponse;
      const newStatus = runningToStatus(data.running);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      setError(null);
    } catch (err) {
      // Ignore abort errors - they occur when component unmounts
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch scheduler status';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onStatusChange, onError]);

  /**
   * Start the scheduler with optional optimistic update.
   */
  const start = useCallback(async (): Promise<void> => {
    // Prevent duplicate start calls
    if (pendingOperationRef.current === 'start') {
      return;
    }

    setLoading(true);
    setError(null);

    // Optimistic update: set status to running immediately
    if (optimisticUpdates) {
      setStatus('running');
      onStatusChange?.('running');
    }

    pendingOperationRef.current = 'start';

    // Create abort controller for this request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/scheduler/start', {
        method: 'POST',
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as SchedulerActionResponse;

      // Check for API error response
      if (data.error) {
        throw new Error(data.error);
      }

      // Update status based on server response
      setStatus('running');
      onStatusChange?.('running');
      onStart?.();
      setError(null);
    } catch (err) {
      // Ignore abort errors - they occur when component unmounts
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // Revert optimistic update on error
      if (optimisticUpdates) {
        await refresh();
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start scheduler';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      pendingOperationRef.current = null;
    }
  }, [optimisticUpdates, refresh, onStart, onStatusChange, onError]);

  /**
   * Stop the scheduler with optional optimistic update.
   */
  const stop = useCallback(async (): Promise<void> => {
    // Prevent duplicate stop calls
    if (pendingOperationRef.current === 'stop') {
      return;
    }

    setLoading(true);
    setError(null);

    // Optimistic update: set status to stopped immediately
    if (optimisticUpdates) {
      setStatus('stopped');
      onStatusChange?.('stopped');
    }

    pendingOperationRef.current = 'stop';

    // Create abort controller for this request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/scheduler/stop', {
        method: 'POST',
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as SchedulerActionResponse;

      // Check for API error response
      if (data.error) {
        throw new Error(data.error);
      }

      // Update status based on server response
      setStatus('stopped');
      onStatusChange?.('stopped');
      onStop?.();
      setError(null);
    } catch (err) {
      // Ignore abort errors - they occur when component unmounts
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // Revert optimistic update on error
      if (optimisticUpdates) {
        await refresh();
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to stop scheduler';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      pendingOperationRef.current = null;
    }
  }, [optimisticUpdates, refresh, onStop, onStatusChange, onError]);

  // Set up Socket.io listener for real-time status updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleSchedulerStatus = (running: boolean) => {
      const newStatus = runningToStatus(running);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      setError(null);
    };

    socket.on('scheduler-status', handleSchedulerStatus);

    return () => {
      socket.off('scheduler-status', handleSchedulerStatus);
    };
  }, [socket, connected, onStatusChange]);

  // Fetch initial status on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    status,
    start,
    stop,
    refresh,
    loading,
    error,
  };
}
