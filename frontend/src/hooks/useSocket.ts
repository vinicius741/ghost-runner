/**
 * Socket.io Hook for Ghost Runner Frontend
 *
 * This hook provides a typed Socket.io client with auto-reconnect,
 * exponential backoff, and event handler management.
 * Extracted from App.tsx for reusability across components.
 *
 * Related: Development Execution Plan Task 1.3.2
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * Socket.io event handler with proper typing.
 */
export type SocketEventHandler<T = unknown> = (data: T) => void;

/**
 * Connection state of the socket.
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Return type for the useSocket hook.
 * Provides a typed Socket.io client with auto-reconnect.
 */
export interface UseSocketResult {
  /** Socket.io client instance */
  socket: Socket | null;
  /** Connection state */
  connected: boolean;
  /** Connection state string */
  connectionState: ConnectionState;
  /** Register an event handler */
  on: <T = unknown>(event: string, handler: SocketEventHandler<T>) => void;
  /** Remove an event handler */
  off: <T = unknown>(event: string, handler: SocketEventHandler<T>) => void;
  /** Remove all handlers for an event */
  offAll: (event: string) => void;
  /** Emit an event to the server */
  emit: <T = unknown>(event: string, data?: T) => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * Options for configuring the useSocket hook behavior.
 */
export interface UseSocketOptions {
  /** Socket.io server URL (default: current origin) */
  url?: string;
  /** Path for the socket.io server (default: /socket.io/) */
  path?: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Enable reconnection (default: true) */
  reconnection?: boolean;
  /** Maximum reconnection attempts (default: Infinity) */
  reconnectionAttempts?: number;
  /** Initial delay between reconnections (default: 1000ms) */
  reconnectionDelay?: number;
  /** Maximum delay between reconnections (default: 5000ms) */
  reconnectionDelayMax?: number;
  /** Connection timeout (default: 20000ms) */
  timeout?: number;
  /** Callback called on successful connection */
  onConnect?: () => void;
  /** Callback called on disconnection */
  onDisconnect?: (reason: string) => void;
  /** Callback called on connection error */
  onError?: (error: Error) => void;
}

/**
 * Store registered event handlers for cleanup.
 */
interface EventHandlerMap {
  [event: string]: Set<SocketEventHandler>;
}

/**
 * Socket.io hook with auto-reconnect and exponential backoff.
 *
 * @param options - Optional configuration for the socket connection
 * @returns Socket client object with connection state and methods
 *
 * @example
 * const { socket, connected, on, off, emit } = useSocket({
 *   onConnect: () => console.log('Connected'),
 *   onError: (error) => console.error(error),
 * });
 *
 * useEffect(() => {
 *   on<Task>('task-started', (task) => {
 *     console.log('Task started:', task);
 *   });
 * }, [on]);
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketResult {
  const {
    url,
    path = '/socket.io/',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = Infinity,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    timeout = 20000,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const handlersRef = useRef<EventHandlerMap>({});
  const socketRef = useRef<Socket | null>(null);

  /**
   * Register an event handler.
   */
  const on = useCallback(<T = unknown>(event: string, handler: SocketEventHandler<T>): void => {
    if (!handlersRef.current[event]) {
      handlersRef.current[event] = new Set();
    }
    handlersRef.current[event].add(handler as SocketEventHandler);

    // Register with socket if connected
    if (socketRef.current) {
      socketRef.current.on(event, handler as SocketEventHandler);
    }
  }, []);

  /**
   * Remove a specific event handler.
   */
  const off = useCallback(<T = unknown>(event: string, handler: SocketEventHandler<T>): void => {
    const handlers = handlersRef.current[event];
    if (handlers) {
      // Always remove from socket if connected
      if (socketRef.current) {
        socketRef.current.off(event, handler as SocketEventHandler);
      }

      handlers.delete(handler as SocketEventHandler);

      // Clean up empty sets
      if (handlers.size === 0) {
        delete handlersRef.current[event];
      }
    }
  }, []);

  /**
   * Remove all handlers for an event.
   */
  const offAll = useCallback((event: string): void => {
    const handlers = handlersRef.current[event];
    if (handlers && socketRef.current) {
      handlers.forEach((handler) => {
        socketRef.current?.off(event, handler);
      });
      delete handlersRef.current[event];
    }
  }, []);

  /**
   * Emit an event to the server.
   */
  const emit = useCallback(<T = unknown>(event: string, data?: T): void => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  /**
   * Manually disconnect the socket.
   */
  const disconnect = useCallback((): void => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  /**
   * Manually reconnect the socket.
   */
  const reconnect = useCallback((): void => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(url, {
      path,
      autoConnect,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      timeout,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    setConnectionState('connecting');

    // Set up connection state listeners
    newSocket.on('connect', () => {
      setConnected(true);
      setConnectionState('connected');
      onConnect?.();
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      setConnectionState('disconnected');
      onDisconnect?.(reason);
    });

    newSocket.on('connect_error', (error) => {
      setConnected(false);
      setConnectionState('error');
      onError?.(error);
    });

    // Register all existing handlers with new socket
    Object.entries(handlersRef.current).forEach(([event, handlers]) => {
      handlers.forEach((handler) => {
        newSocket.on(event, handler);
      });
    });

    // Cleanup on unmount
    return () => {
      Object.entries(handlersRef.current).forEach(([event, handlers]) => {
        handlers.forEach((handler) => {
          newSocket.off(event, handler);
        });
      });
      newSocket.disconnect();
      socketRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    socket,
    connected,
    connectionState,
    on,
    off,
    offAll,
    emit,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for typed socket events.
 * Provides type-safe event handling.
 *
 * @param socket - Socket instance from useSocket
 * @param event - Event name
 * @param handler - Event handler function
 *
 * @example
 * const { socket } = useSocket();
 * useSocketEvent(socket, 'task-started', (data: TaskStartData) => {
 *   console.log('Task started:', data.taskName);
 * });
 */
export function useSocketEvent<T = unknown>(
  socket: Socket | null,
  event: string,
  handler: SocketEventHandler<T>
): void {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler as SocketEventHandler);
    return () => {
      socket.off(event, handler as SocketEventHandler);
    };
  }, [socket, event, handler]);
}

/**
 * Hook for socket connection status with auto-refetch on reconnect.
 *
 * @param socket - Socket instance from useSocket
 * @param onReconnect - Callback to execute when socket reconnects
 *
 * @example
 * const { socket } = useSocket();
 * useSocketReconnect(socket, () => {
 *   fetchTasks(); // Refetch data on reconnect
 * });
 */
export function useSocketReconnect(
  socket: Socket | null,
  onReconnect: () => void
): void {
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      if (wasConnectedRef.current) {
        onReconnect();
      }
      wasConnectedRef.current = true;
    };

    const handleDisconnect = () => {
      wasConnectedRef.current = true;
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, onReconnect]);
}
