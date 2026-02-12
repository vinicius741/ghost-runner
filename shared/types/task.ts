/**
 * Shared task type definitions.
 *
 * These types are used across the backend (task execution, reporting)
 * and frontend (task list, logs).
 *
 * @module shared/types/task
 */

/**
 * Task type indicating where the task is stored.
 */
export type TaskType = 'public' | 'private' | 'root';

/**
 * Basic task information returned by the API.
 */
export interface Task {
  /** Unique task name (filename without extension) */
  name: string;
  /** Location where the task is stored */
  type: TaskType;
}

/**
 * Log entry for real-time logging via Socket.io.
 */
export interface LogEntry {
  /** Log message content */
  message: string;
  /** ISO timestamp when log was created */
  timestamp: string;
  /** Type of log entry */
  type: 'normal' | 'error' | 'system';
}

/**
 * Valid task status values.
 * Tasks emit these statuses via stdout markers: [TASK_STATUS:STATUS]
 */
export type TaskStatus = 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED';

/**
 * Valid data type options for info-gathering task results.
 * Determines how the data should be rendered in the UI.
 */
export type InfoGatheringDataType = 'key-value' | 'table' | 'custom';

/**
 * Metadata for info-gathering task results.
 */
export interface InfoGatheringMetadata {
  /** Category identifier for grouping similar tasks */
  category?: string;
  /** Human-readable display name */
  displayName?: string;
  /** Type of data - determines rendering method */
  dataType?: InfoGatheringDataType;
  /** Time-to-live in seconds */
  ttl?: number;
}

/**
 * Parsed task status data from stdout markers.
 */
export interface TaskStatusData {
  /** Task name (may be updated during execution) */
  taskName?: string;
  /** ISO timestamp of status */
  timestamp?: string;
  /** Error type for FAILED status */
  errorType?: string;
  /** Human-readable error message */
  errorMessage?: string;
  /** Additional structured context */
  errorContext?: Record<string, unknown>;
  /** Data returned by task (for COMPLETED_WITH_DATA) */
  data?: unknown;
  /** Metadata about returned data */
  metadata?: InfoGatheringMetadata;
}

/**
 * Parsed task status with type and data.
 */
export interface ParsedTaskStatus {
  status: TaskStatus;
  data: TaskStatusData;
}

/**
 * Task started event payload.
 */
export interface TaskStartedPayload {
  taskName: string;
  timestamp: string;
}

/**
 * Task completed event payload.
 */
export interface TaskCompletedPayload {
  taskName: string;
  timestamp: string;
}

/**
 * Task failed event payload.
 */
export interface TaskFailedPayload {
  taskName: string;
  errorType: string;
  errorMessage: string;
  context: Record<string, unknown>;
  timestamp: string;
}

/**
 * Type guard for valid task status values.
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return status === 'STARTED' || status === 'COMPLETED' || status === 'COMPLETED_WITH_DATA' || status === 'FAILED';
}

/**
 * Type guard to check if TaskStatusData contains info-gathering data.
 */
export function isInfoGatheringData(
  data: TaskStatusData
): data is TaskStatusData & { data: unknown; metadata: InfoGatheringMetadata } {
  return data.data !== undefined && data.metadata !== undefined;
}
