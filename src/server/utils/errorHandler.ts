/**
 * Error handling utilities for Express controllers.
 *
 * Provides consistent error handling across all API endpoints.
 *
 * @module server/utils/errorHandler
 */

import { Response } from 'express';

/**
 * Handles errors in Express controller functions with consistent logging and response.
 *
 * This utility ensures all API endpoints return errors in the same format:
 * - HTTP 500 status for internal server errors
 * - JSON response with descriptive error message
 * - Console logging with context for debugging
 *
 * @param error - The caught error (unknown type for safety)
 * @param res - Express Response object
 * @param context - Optional context string for logging (e.g., 'Error in /api/tasks/run')
 *
 * @example
 * ```typescript
 * try {
 *   // ... controller logic
 * } catch (error) {
 *   handleControllerError(error, res, 'Error in /api/tasks/run');
 * }
 * ```
 */
export function handleControllerError(
  error: unknown,
  res: Response,
  context?: string
): void {
  const prefix = context ? `${context}:` : 'Controller error:';
  console.error(prefix, error);

  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(500).json({ error: `Internal Server Error: ${message}` });
}

/**
 * Extracts a safe error message from an unknown error type.
 *
 * @param error - The caught error
 * @returns A string message safe for display
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
