/**
 * Task status parsing utilities for the Ghost Runner backend.
 *
 * This module provides functions to parse task status from stdout output.
 * Tasks emit status markers in the format [TASK_STATUS:STATUS]optional_json_data
 *
 * @module server/utils/taskParser
 */

import type { ParsedTaskStatus, TaskStatusData } from '../../types/task.types';
import { isValidTaskStatus } from '../../types/task.types';

/**
 * The prefix used to identify task status markers in stdout.
 */
export const TASK_STATUS_PREFIX = '[TASK_STATUS:';

/**
 * Parses a single line of stdout to extract task status information.
 * Looks for markers in the format [TASK_STATUS:STATUS]optional_json_data
 *
 * @param line - A line of stdout output to parse
 * @returns Parsed task status or null if no status marker is found
 *
 * @example
 * ```ts
 * const line = '[TASK_STATUS:STARTED]{"taskName":"my-task","timestamp":"2024-01-01"}';
 * const parsed = parseTaskStatus(line);
 * if (parsed) {
 *   console.log(parsed.status); // 'STARTED'
 *   console.log(parsed.data.taskName); // 'my-task'
 * }
 * ```
 */
export function parseTaskStatus(line: string): ParsedTaskStatus | null {
  const startIndex = line.indexOf(TASK_STATUS_PREFIX);

  if (startIndex === -1) {
    return null;
  }

  const endIndex = line.indexOf(']', startIndex);
  if (endIndex === -1) {
    return null;
  }

  const status = line.substring(startIndex + TASK_STATUS_PREFIX.length, endIndex);
  const jsonPart = line.substring(endIndex + 1);

  if (!isValidTaskStatus(status)) {
    return null;
  }

  try {
    const data = jsonPart ? JSON.parse(jsonPart) : {};
    return { status, data };
  } catch {
    // If JSON parsing fails, return status with empty data
    return { status, data: {} };
  }
}

/**
 * Parses multiple lines of stdout to extract all task status markers.
 *
 * @param lines - Array of stdout lines to parse
 * @returns Array of parsed task statuses (may be empty)
 *
 * @example
 * ```ts
 * const output = `Starting task...\n[TASK_STATUS:STARTED]\nWorking...\n[TASK_STATUS:COMPLETED]`;
 * const statuses = parseTaskStatuses(output.split('\n'));
 * console.log(statuses.length); // 2
 * ```
 */
export function parseTaskStatuses(lines: string[]): ParsedTaskStatus[] {
  const results: ParsedTaskStatus[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseTaskStatus(trimmed);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Checks if a line contains a task status marker.
 * Useful for filtering lines before parsing.
 *
 * @param line - A line of stdout to check
 * @returns True if the line contains a task status marker
 *
 * @example
 * ```ts
 * const lines = stdout.split('\n');
 * const statusLines = lines.filter(containsTaskStatus);
 * ```
 */
export function containsTaskStatus(line: string): boolean {
  return line.includes(TASK_STATUS_PREFIX);
}

/**
 * Extracts the task status value from a line without full parsing.
 * Useful for quick status checks.
 *
 * @param line - A line of stdout to extract status from
 * @returns The status string (e.g., 'STARTED', 'COMPLETED') or null
 *
 * @example
 * ```ts
 * const line = '[TASK_STATUS:FAILED]{"errorMessage":"Something went wrong"}';
 * const status = extractStatus(line); // 'FAILED'
 * ```
 */
export function extractStatus(line: string): string | null {
  const startIndex = line.indexOf(TASK_STATUS_PREFIX);

  if (startIndex === -1) {
    return null;
  }

  const endIndex = line.indexOf(']', startIndex);
  if (endIndex === -1) {
    return null;
  }

  const status = line.substring(startIndex + TASK_STATUS_PREFIX.length, endIndex);

  return isValidTaskStatus(status) ? status : null;
}

/**
 * Creates a task status marker string for emitting status updates.
 * This is the inverse of parsing - it creates the marker format.
 *
 * @param status - The task status
 * @param data - Optional data to include with the status
 * @returns A formatted status marker string
 *
 * @example
 * ```ts
 * const marker = createStatusMarker('STARTED', { taskName: 'my-task' });
 * console.log(marker); // [TASK_STATUS:STARTED]{"taskName":"my-task"}
 * ```
 */
export function createStatusMarker(
  status: 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED',
  data?: TaskStatusData
): string {
  const jsonPart = data && Object.keys(data).length > 0 ? JSON.stringify(data) : '';
  return `${TASK_STATUS_PREFIX}${status}]${jsonPart}`;
}
