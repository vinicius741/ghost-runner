/**
 * Shared Socket.io event type definitions.
 *
 * These types define the contract for all real-time events
 * communicated between backend and frontend.
 *
 * @module shared/types/socket
 */

import type { LogEntry } from './task';
import type { ScheduleUpdatePayload } from './schedule';
import type { FailureRecordedPayload } from './failure';
import type {
  TaskStartedPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
} from './task';
import type { InfoDataUpdatedPayload } from './infoGathering';

/**
 * All server-to-client event types.
 */
export interface ServerToClientEvents {
  /** Log message from task execution (accepts string for backward compatibility) */
  log: (entry: string | LogEntry) => void;
  /** Task has started execution */
  'task-started': (payload: TaskStartedPayload) => void;
  /** Task completed successfully */
  'task-completed': (payload: TaskCompletedPayload) => void;
  /** Task failed with error */
  'task-failed': (payload: TaskFailedPayload) => void;
  /** Schedule has been updated */
  'schedule-updated': (payload: ScheduleUpdatePayload) => void;
  /** New failure has been recorded */
  'failure-recorded': (payload: FailureRecordedPayload) => void;
  /** Info-gathering data updated */
  'info-data-updated': (payload: InfoDataUpdatedPayload) => void;
  /** Scheduler status changed */
  'scheduler-status': (payload: { running: boolean }) => void;
}

/**
 * All client-to-server event types.
 * Currently empty - all communication is server-to-client.
 */
export interface ClientToServerEvents {
  // Reserved for future client-to-server events
}

/**
 * Inter-server event types (for Socket.io adapters).
 */
export interface InterServerEvents {
  // Reserved for future inter-server events
}

/**
 * Socket data attached to each socket connection.
 */
export interface SocketData {
  connectedAt: Date;
}
