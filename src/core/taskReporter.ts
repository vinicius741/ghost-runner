/**
 * Task result reporting utilities.
 * Provides functions to emit structured task status via stdout for parsing by the server.
 */

import { isTaskError, type TaskError } from './errors';

/**
 * Task execution status types.
 */
export type TaskStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

/**
 * Structured result of a task execution.
 */
export interface TaskResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Task name */
  taskName: string;
  /** Timestamp of completion */
  timestamp: string;
  /** Error type if task failed */
  errorType?: string;
  /** Additional error context */
  errorContext?: Record<string, unknown>;
  /** Error message */
  errorMessage?: string;
}

/**
 * The prefix used for status markers in stdout.
 * Server controllers parse this to detect task status changes.
 */
const STATUS_PREFIX = '[TASK_STATUS:';

/**
 * Emits a task status marker to stdout.
 * These markers are parsed by the server to track task execution.
 *
 * @param status - The task status (STARTED, COMPLETED, FAILED)
 * @param taskName - Name of the task
 * @param extraData - Optional additional data to include (for FAILED status)
 */
function emitStatus(status: TaskStatus, taskName: string, extraData?: Record<string, unknown>): void {
  if (status === 'FAILED' && extraData) {
    // For failures, include error context as JSON
    console.log(`${STATUS_PREFIX}${status}]${JSON.stringify({ taskName, ...extraData })}`);
  } else if (status === 'STARTED') {
    console.log(`${STATUS_PREFIX}${status}]${JSON.stringify({ taskName })}`);
  } else {
    console.log(`${STATUS_PREFIX}${status}]${JSON.stringify({ taskName, timestamp: new Date().toISOString() })}`);
  }
}

/**
 * Reports that a task has started execution.
 * @param taskName - Name of the task
 */
export function reportTaskStarted(taskName: string): void {
  emitStatus('STARTED', taskName);
}

/**
 * Reports that a task completed successfully.
 * @param taskName - Name of the task
 */
export function reportTaskCompleted(taskName: string): void {
  emitStatus('COMPLETED', taskName);
}

/**
 * Reports that a task failed with an error.
 * @param taskName - Name of the task
 * @param error - The error that caused the failure
 */
export function reportTaskFailed(taskName: string, error: unknown): void {
  const timestamp = new Date().toISOString();

  if (isTaskError(error)) {
    // Custom TaskError - extract structured data
    emitStatus('FAILED', taskName, {
      errorType: error.errorType,
      errorMessage: error.message,
      errorContext: error.toJSON(),
      timestamp,
    });
  } else if (error instanceof Error) {
    // Standard Error - basic info
    emitStatus('FAILED', taskName, {
      errorType: 'unknown',
      errorMessage: error.message,
      errorContext: {
        name: error.name,
        stack: error.stack,
      },
      timestamp,
    });
  } else {
    // Unknown error type
    emitStatus('FAILED', taskName, {
      errorType: 'unknown',
      errorMessage: String(error),
      errorContext: {},
      timestamp,
    });
  }
}

/**
 * Reports the final result of a task execution.
 * Use this in the task runner's try/catch/finally block.
 *
 * @param taskName - Name of the task
 * @param error - Error from catch block, or undefined if successful
 * @returns The task result object
 */
export function reportTaskResult(taskName: string, error?: unknown): TaskResult {
  const timestamp = new Date().toISOString();

  if (error === undefined) {
    reportTaskCompleted(taskName);
    return {
      success: true,
      taskName,
      timestamp,
    };
  }

  reportTaskFailed(taskName, error);

  if (isTaskError(error)) {
    return {
      success: false,
      taskName,
      timestamp,
      errorType: error.errorType,
      errorContext: error.toJSON(),
      errorMessage: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      taskName,
      timestamp,
      errorType: 'unknown',
      errorContext: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorMessage: error.message,
    };
  }

  return {
    success: false,
    taskName,
    timestamp,
    errorType: 'unknown',
    errorMessage: String(error),
    errorContext: {},
  };
}

/**
 * Gets the exit code for a task result.
 * Returns 0 for success, 1 for failure.
 *
 * @param result - The task result
 * @returns Process exit code (0 or 1)
 */
export function getExitCode(result: TaskResult): number {
  return result.success ? 0 : 1;
}
