/**
 * FailureRepository - Data access layer for failure records.
 *
 * This repository abstracts all file system operations related to failures.
 * Socket.io event emission is handled by the controller layer.
 *
 * @module server/repositories/FailureRepository
 */

import { promises as fs } from 'fs';
import { FAILURES_FILE } from '../config';
import type { FailureRecord, FailureErrorType } from '../../../shared/types';

// Re-export for backward compatibility
export type { FailureRecord, FailureErrorType } from '../../../shared/types';

/**
 * Repository for managing failure record persistence.
 */
export class FailureRepository {
  private readonly filePath: string;

  constructor(filePath: string = FAILURES_FILE) {
    this.filePath = filePath;
  }

  /**
   * Reads all failure records from the JSON file.
   *
   * @returns Promise resolving to array of failure records
   * @throws Error if file read fails (other than ENOENT)
   */
  async getAll(): Promise<FailureRecord[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const failures = JSON.parse(content) as FailureRecord[];
      return failures;
    } catch (error) {
      const errnoError = error as NodeJS.ErrnoException;
      // File doesn't exist yet - return empty array (normal on first run)
      if (errnoError.code === 'ENOENT') {
        return [];
      }
      // Log unexpected errors
      console.error('Error reading failures file:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single failure record by ID.
   *
   * @param id - The unique identifier of the failure record
   * @returns Promise resolving to the failure record or undefined if not found
   */
  async getById(id: string): Promise<FailureRecord | undefined> {
    const failures = await this.getAll();
    return failures.find((f) => f.id === id);
  }

  /**
   * Saves failure records to the JSON file.
   *
   * @param failures - Array of failure records to write
   */
  async save(failures: FailureRecord[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(failures, null, 2), 'utf-8');
  }

  /**
   * Clears all failure records.
   */
  async clear(): Promise<void> {
    await this.save([]);
  }

  /**
   * Creates a new failure record with a unique ID.
   *
   * @param taskName - Name of the task that failed
   * @param errorType - Type of error that occurred
   * @param errorMessage - Human-readable error message
   * @param errorContext - Additional structured context about the error
   * @returns A new failure record instance
   */
  createRecord(
    taskName: string,
    errorType: string,
    errorMessage: string,
    errorContext: Record<string, unknown>
  ): FailureRecord {
    const now = new Date().toISOString();
    const id = `${taskName}-${errorType}-${Date.now()}`;

    // Validate errorType - default to 'unknown' if invalid
    const validErrorTypes: ReadonlyArray<FailureErrorType> = ['element_not_found', 'navigation_failure', 'timeout', 'unknown'];
    const validatedErrorType: FailureErrorType = validErrorTypes.includes(errorType as FailureErrorType)
      ? (errorType as FailureErrorType)
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
   * Records a new failure with deduplication logic.
   * If a similar failure exists (same task + errorType within 24 hours),
   * increment its count instead of creating a new entry.
   *
   * @param taskName - Name of the task that failed
   * @param errorType - Type of error that occurred
   * @param errorMessage - Human-readable error message
   * @param errorContext - Additional structured context about the error
   * @returns The failure record (either updated existing or new)
   */
  async record(
    taskName: string,
    errorType: string,
    errorMessage: string,
    errorContext: Record<string, unknown>
  ): Promise<FailureRecord> {
    const failures = await this.getAll();
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
      await this.save(failures);
      return existingFailure;
    }

    // Create new failure record
    const newFailure = this.createRecord(taskName, errorType, errorMessage, errorContext);
    failures.push(newFailure);
    await this.save(failures);

    return newFailure;
  }

  /**
   * Dismisses a specific failure by ID.
   *
   * @param id - The unique identifier of the failure record
   * @returns True if the failure was found and dismissed, false otherwise
   */
  async dismiss(id: string): Promise<boolean> {
    const failures = await this.getAll();
    const failure = failures.find((f) => f.id === id);

    if (!failure) {
      return false;
    }

    failure.dismissed = true;
    await this.save(failures);

    return true;
  }

  /**
   * Retrieves only active (non-dismissed) failure records.
   *
   * Fallback behavior: If all failures are dismissed, returns all failures.
   * This ensures the UI always shows historical context rather than an empty state,
   * which is more useful for understanding past issues.
   *
   * @returns Array of active failure records, or all records if all are dismissed
   */
  async getActive(): Promise<FailureRecord[]> {
    const failures = await this.getAll();
    const activeFailures = failures.filter((f) => !f.dismissed);
    return activeFailures.length > 0 ? activeFailures : failures;
  }
}

// Export a singleton instance for convenience
export const failureRepository = new FailureRepository();
