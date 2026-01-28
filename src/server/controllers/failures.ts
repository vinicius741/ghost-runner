/**
 * Failures controller - handles HTTP requests for failure management.
 *
 * This controller has been refactored to use the repository pattern:
 * - FailureRepository handles all failure record persistence
 * - Controller is now a thin HTTP layer that delegates to the repository
 * - Socket.io event emission is handled at the controller level
 *
 * @module server/controllers/failures
 */

import type { Server } from 'socket.io';
import { failureRepository, type FailureRecord } from '../repositories/FailureRepository';

// Re-export FailureRecord type for use by other modules
export type { FailureRecord };

/**
 * Records a new failure and emits Socket.io event.
 *
 * This function is used by the TaskExecutionService to record failures.
 * If a similar failure exists (same task + errorType within 24 hours),
 * increment its count instead of creating a new entry.
 *
 * @param taskName - Name of the task that failed
 * @param errorType - Type of error that occurred
 * @param errorMessage - Human-readable error message
 * @param errorContext - Additional structured context about the error
 * @param io - Optional Socket.io instance for emitting events
 * @returns The recorded failure record
 */
export async function recordFailure(
  taskName: string,
  errorType: string,
  errorMessage: string,
  errorContext: Record<string, unknown>,
  io?: Server
): Promise<FailureRecord> {
  const failure = await failureRepository.record(
    taskName,
    errorType,
    errorMessage,
    errorContext
  );

  // Emit Socket.io event
  if (io) {
    io.emit('failure-recorded', failure);
  }

  return failure;
}

/**
 * Clears all failure records and emits Socket.io event.
 *
 * @param io - Optional Socket.io instance for emitting events
 */
export async function clearFailures(io?: Server): Promise<void> {
  await failureRepository.clear();

  // Emit Socket.io event
  if (io) {
    io.emit('failures-cleared');
  }
}

/**
 * Dismisses a specific failure by ID and emits Socket.io event.
 *
 * @param id - The unique identifier of the failure record
 * @param io - Optional Socket.io instance for emitting events
 * @returns True if the failure was found and dismissed, false otherwise
 */
export async function dismissFailure(id: string, io?: Server): Promise<boolean> {
  const success = await failureRepository.dismiss(id);

  if (success && io) {
    io.emit('failure-dismissed', id);
  }

  return success;
}

/**
 * Controller function: GET /api/failures
 *
 * Returns all active (non-dismissed) failure records.
 * If all failures are dismissed, returns all records.
 */
export const getFailuresHandler = async (): Promise<{ failures: FailureRecord[] }> => {
  const failures = await failureRepository.getActive();
  return { failures };
};

/**
 * Controller function: DELETE /api/failures
 *
 * Clears all failure records.
 */
export const clearFailuresHandler = async (io?: Server): Promise<{ message: string }> => {
  await clearFailures(io);
  return { message: 'All failures cleared.' };
};

/**
 * Controller function: POST /api/failures/:id/dismiss
 *
 * Dismisses a specific failure by ID.
 */
export const dismissFailureHandler = async (id: string, io?: Server): Promise<{ success: boolean; message?: string }> => {
  const success = await dismissFailure(id, io);
  if (!success) {
    return { success: false, message: 'Failure not found.' };
  }
  return { success: true, message: 'Failure dismissed.' };
};
