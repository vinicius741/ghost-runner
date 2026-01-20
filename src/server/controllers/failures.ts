/**
 * Failures controller - manages failure records persistence.
 * Failures are stored in failures.json in the root directory.
 */

import { promises as fs } from 'fs';
import type { Server } from 'socket.io';
import { FAILURES_FILE } from '../config';

/**
 * Failure record structure (shared with frontend)
 */
export interface FailureRecord {
  id: string;
  taskName: string;
  errorType: 'element_not_found' | 'navigation_failure' | 'timeout' | 'unknown';
  context: Record<string, unknown>;
  timestamp: string;
  count: number;
  lastSeen: string;
  dismissed?: boolean;
}

/**
 * Creates a failure record from task failure data.
 */
export function createFailureRecord(
  taskName: string,
  errorType: string,
  errorMessage: string,
  errorContext: Record<string, unknown>
): FailureRecord {
  const now = new Date().toISOString();
  const id = `${taskName}-${errorType}-${Date.now()}`;

  // Validate errorType - default to 'unknown' if invalid
  const validErrorTypes: ReadonlyArray<FailureRecord['errorType']> = ['element_not_found', 'navigation_failure', 'timeout', 'unknown'];
  const validatedErrorType: FailureRecord['errorType'] = validErrorTypes.includes(
    errorType as FailureRecord['errorType']
  )
    ? (errorType as FailureRecord['errorType'])
    : 'unknown';

  return {
    id,
    taskName,
    errorType: validatedErrorType,
    context: {
      ...errorContext,
      errorMessage, // Include errorMessage in context for UI display
    },
    timestamp: now,
    count: 1,
    lastSeen: now,
    dismissed: false,
  };
}

/**
 * Reads all failure records from the JSON file.
 */
export async function getFailures(): Promise<FailureRecord[]> {
  try {
    const content = await fs.readFile(FAILURES_FILE, 'utf-8');
    const failures = JSON.parse(content) as FailureRecord[];
    return failures;
  } catch (error) {
    // File doesn't exist yet - return empty array (normal on first run)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    // Log unexpected errors
    console.error('Error reading failures file:', error);
    return [];
  }
}

/**
 * Writes failure records to the JSON file.
 */
async function writeFailures(failures: FailureRecord[]): Promise<void> {
  await fs.writeFile(FAILURES_FILE, JSON.stringify(failures, null, 2), 'utf-8');
}

/**
 * Records a new failure.
 * If a similar failure exists (same task + errorType within 24 hours),
 * increment its count instead of creating a new entry.
 */
export async function recordFailure(
  taskName: string,
  errorType: string,
  errorMessage: string,
  errorContext: Record<string, unknown>,
  io?: Server
): Promise<FailureRecord> {
  const failures = await getFailures();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Check for similar recent failure to deduplicate
  const existingFailure = failures.find(
    (f) =>
      f.taskName === taskName &&
      f.errorType === errorType &&
      !f.dismissed &&
      f.lastSeen >= oneDayAgo
  );

  if (existingFailure) {
    // Update existing failure
    existingFailure.count += 1;
    existingFailure.lastSeen = now.toISOString();
    await writeFailures(failures);

    // Emit Socket.io event
    if (io) {
      io.emit('failure-recorded', existingFailure);
    }

    return existingFailure;
  }

  // Create new failure record
  const newFailure = createFailureRecord(taskName, errorType, errorMessage, errorContext);
  failures.push(newFailure);
  await writeFailures(failures);

  // Emit Socket.io event
  if (io) {
    io.emit('failure-recorded', newFailure);
  }

  return newFailure;
}

/**
 * Clears all failure records.
 */
export async function clearFailures(io?: Server): Promise<void> {
  await writeFailures([]);

  // Emit Socket.io event
  if (io) {
    io.emit('failures-cleared');
  }
}

/**
 * Dismisses a specific failure by ID.
 */
export async function dismissFailure(id: string, io?: Server): Promise<boolean> {
  const failures = await getFailures();
  const failure = failures.find((f) => f.id === id);

  if (!failure) {
    return false;
  }

  failure.dismissed = true;
  await writeFailures(failures);

  // Emit Socket.io event
  if (io) {
    io.emit('failure-dismissed', id);
  }

  return true;
}

/**
 * Controller function: GET /api/failures
 */
export const getFailuresHandler = async (): Promise<{ failures: FailureRecord[] }> => {
  const failures = await getFailures();
  // Filter out dismissed failures unless all are dismissed
  const activeFailures = failures.filter((f) => !f.dismissed);
  return { failures: activeFailures.length > 0 ? activeFailures : failures };
};

/**
 * Controller function: DELETE /api/failures
 */
export const clearFailuresHandler = async (io?: Server): Promise<{ message: string }> => {
  await clearFailures(io);
  return { message: 'All failures cleared.' };
};

/**
 * Controller function: POST /api/failures/:id/dismiss
 */
export const dismissFailureHandler = async (id: string, io?: Server): Promise<{ success: boolean; message?: string }> => {
  const success = await dismissFailure(id, io);
  if (!success) {
    return { success: false, message: 'Failure not found.' };
  }
  return { success: true, message: 'Failure dismissed.' };
};
