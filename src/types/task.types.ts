/**
 * Task-related type definitions for the Ghost Runner backend.
 *
 * This module contains all interfaces and types related to task execution,
 * status reporting, and task metadata handling.
 *
 * @module types/task.types
 */

/**
 * Valid data type options for info-gathering task results.
 * Determines how the data should be rendered in the UI.
 */
export type InfoGatheringDataType = 'key-value' | 'table' | 'custom';

/**
 * Metadata for info-gathering task results.
 * Provides additional context about task completion with data.
 */
export interface InfoGatheringMetadata {
  /** Category identifier for grouping similar info-gathering tasks */
  category?: string;
  /** Human-readable display name for the task result */
  displayName?: string;
  /** Type of data returned by the task - determines rendering method */
  dataType?: InfoGatheringDataType;
  /** Time-to-live for cached results in milliseconds */
  ttl?: number;
}

/**
 * Parsed task status data from stdout markers.
 * Contains the structured data emitted by tasks during execution.
 */
export interface TaskStatusData {
  /** Name of the task (may be updated during execution) */
  taskName?: string;
  /** ISO timestamp of when the status was recorded */
  timestamp?: string;
  /** Type of error that occurred (for FAILED status) */
  errorType?: string;
  /** Human-readable error message */
  errorMessage?: string;
  /** Additional structured context about the error or task state */
  errorContext?: Record<string, unknown>;
  /** Raw data returned by the task (for COMPLETED_WITH_DATA status) */
  data?: unknown;
  /** Metadata about the returned data (for COMPLETED_WITH_DATA status) */
  metadata?: InfoGatheringMetadata;
}

/**
 * Parsed task status result with status type and associated data.
 */
export interface ParsedTaskStatus {
  /** Current status of the task execution */
  status: TaskStatus;
  /** Structured data associated with this status update */
  data: TaskStatusData;
}

/**
 * Valid task status values.
 * Tasks emit these statuses via stdout markers: [TASK_STATUS:STATUS]
 */
export type TaskStatus = 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED';

/**
 * Type guard to check if TaskStatusData contains info-gathering data.
 * Verifies that both data and metadata fields are present.
 *
 * @param data - The task status data to check
 * @returns True if the data contains info-gathering results
 *
 * @example
 * ```ts
 * if (isInfoGatheringData(statusData)) {
 *   // Access statusData.data and statusData.metadata safely
 *   console.log(statusData.metadata.displayName);
 * }
 * ```
 */
export function isInfoGatheringData(
  data: TaskStatusData
): data is TaskStatusData & { data: unknown; metadata: InfoGatheringMetadata } {
  return data.data !== undefined && data.metadata !== undefined;
}

/**
 * Type guard for valid task status values.
 *
 * @param status - The status string to validate
 * @returns True if the status is a valid TaskStatus value
 *
 * @example
 * ```ts
 * if (isValidTaskStatus(inputStatus)) {
 *   // inputStatus is now typed as TaskStatus
 *   handleTaskStatus(inputStatus);
 * }
 * ```
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return status === 'STARTED' || status === 'COMPLETED' || status === 'COMPLETED_WITH_DATA' || status === 'FAILED';
}
