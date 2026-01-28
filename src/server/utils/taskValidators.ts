/**
 * Task validation utilities for the Ghost Runner backend.
 *
 * This module provides validation functions for task names and configurations,
 * ensuring security and preventing injection attacks.
 *
 * @module server/utils/taskValidators
 */

/**
 * Validates a task name to prevent command injection and other security issues.
 * Only allows alphanumeric characters, hyphens, and underscores.
 *
 * @param taskName - The task name to validate
 * @returns True if the task name is valid and safe to execute
 *
 * @example
 * ```ts
 * if (isValidTaskName('my-task-123')) {
 *   executeTask('my-task-123');
 * }
 * ```
 */
export function isValidTaskName(taskName: string): boolean {
  // Task names should be alphanumeric with hyphens and underscores only
  // Forward slashes are NOT allowed to prevent path traversal attacks
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return (
    validPattern.test(taskName) &&
    taskName.length > 0 &&
    taskName.length < 100
  );
}

/**
 * Sanitizes a task name by removing any characters that don't match the valid pattern.
 * Useful for creating safe task identifiers from user input.
 *
 * @param taskName - The task name to sanitize
 * @returns A sanitized task name containing only safe characters
 *
 * @example
 * ```ts
 * const safeName = sanitizeTaskName('My Task!@#'); // Returns 'MyTask'
 * ```
 */
export function sanitizeTaskName(taskName: string): string {
  // Remove any characters that aren't alphanumeric, hyphens, or underscores
  return taskName.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Validates that a task name is not empty and doesn't exceed the maximum length.
 * This is a basic validation that can be combined with other checks.
 *
 * @param taskName - The task name to validate
 * @returns True if the task name has a valid length
 *
 * @example
 * ```ts
 * if (hasValidTaskNameLength(taskName)) {
 *   // Proceed with additional validation
 * }
 * ```
 */
export function hasValidTaskNameLength(taskName: string): boolean {
  const MIN_TASK_NAME_LENGTH = 1;
  const MAX_TASK_NAME_LENGTH = 100;
  return (
    taskName.length >= MIN_TASK_NAME_LENGTH &&
    taskName.length <= MAX_TASK_NAME_LENGTH
  );
}

/**
 * Validates that a task name doesn't contain path traversal attempts.
 * Checks for sequences like '../' or '..\\' that could be used to escape the tasks directory.
 *
 * @param taskName - The task name to validate
 * @returns True if the task name doesn't contain path traversal sequences
 *
 * @example
 * ```ts
 * if (hasNoPathTraversal(taskName)) {
 *   // Safe to use in file paths
 * }
 * ```
 */
export function hasNoPathTraversal(taskName: string): boolean {
  const pathTraversalPatterns = [
    '../',
    '..\\',
    '%2e%2e', // URL encoded '../'
    '%252e', // Double URL encoded '.'
    '..%2f',
    '..%5c',
  ];

  const lowerName = taskName.toLowerCase();
  return !pathTraversalPatterns.some(pattern => lowerName.includes(pattern));
}

/**
 * Performs comprehensive validation on a task name.
 * Combines all validation checks for maximum security.
 *
 * @param taskName - The task name to validate
 * @returns An object with validation result and optional error message
 *
 * @example
 * ```ts
 * const result = validateTaskName('my-task');
 * if (result.valid) {
 *   executeTask('my-task');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateTaskName(taskName: string): {
  valid: boolean;
  error?: string;
} {
  if (!hasValidTaskNameLength(taskName)) {
    return {
      valid: false,
      error: 'Task name must be between 1 and 100 characters',
    };
  }

  if (!hasNoPathTraversal(taskName)) {
    return {
      valid: false,
      error: 'Task name contains invalid path traversal sequences',
    };
  }

  if (!isValidTaskName(taskName)) {
    return {
      valid: false,
      error: 'Task name contains invalid characters. Use only alphanumeric characters, hyphens, and underscores',
    };
  }

  return { valid: true };
}
