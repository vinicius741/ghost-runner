/**
 * Shared failure type definitions.
 *
 * These types are used across the backend (failure repository, controllers)
 * and frontend (warnings panel).
 *
 * @module shared/types/failure
 */

/**
 * Valid error type values for failure records.
 */
export type FailureErrorType = 'element_not_found' | 'navigation_failure' | 'timeout' | 'unknown';

/**
 * Failure record structure.
 * Represents a task failure with deduplication support.
 */
export interface FailureRecord {
  /** Unique identifier (taskName-errorType-timestamp) */
  id: string;
  /** Name of the task that failed */
  taskName: string;
  /** Classification of the error */
  errorType: FailureErrorType;
  /** Additional context about the error */
  context: Record<string, unknown>;
  /** ISO timestamp of first occurrence */
  timestamp: string;
  /** Number of times this error has occurred (deduplication counter) */
  count: number;
  /** ISO timestamp of most recent occurrence */
  lastSeen: string;
  /** Whether the failure has been dismissed by user */
  dismissed?: boolean;
}

/**
 * Failure recorded event payload.
 * Emitted via Socket.io when a new failure is recorded.
 */
export interface FailureRecordedPayload {
  failure: FailureRecord;
}
