/**
 * Custom application error class.
 *
 * Provides structured error information including error codes,
 * HTTP status codes, and additional context.
 *
 * @module server/errors/AppError
 */

import { ErrorCode, ERROR_MESSAGES } from './errorCodes';

/**
 * Additional context that can be attached to an error.
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Custom error class for application-specific errors.
 * Extends the native Error class with additional properties
 * for structured error handling.
 */
export class AppError extends Error {
  /** Machine-readable error code */
  public readonly code: ErrorCode;

  /** HTTP status code */
  public readonly statusCode: number;

  /** Additional error context */
  public readonly context?: ErrorContext;

  /** Whether the error is operational (expected) or programming error */
  public readonly isOperational: boolean;

  /**
   * Creates a new AppError instance.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param statusCode - HTTP status code (default: 500)
   * @param context - Additional error context
   * @param isOperational - Whether this is an expected error (default: true)
   */
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates a JSON representation of the error for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      code: this.code,
      ...(this.context && { context: this.context }),
    };
  }

  /**
   * Creates an AppError from an error code with default message.
   */
  static fromCode(code: ErrorCode, context?: ErrorContext): AppError {
    const message = ERROR_MESSAGES[code];
    const statusCode = getStatusCodeForCode(code);
    return new AppError(message, code, statusCode, context);
  }

  /**
   * Creates a validation error.
   */
  static validation(message: string, context?: ErrorContext): AppError {
    return new AppError(message, ErrorCode.VALIDATION_ERROR, 400, context);
  }

  /**
   * Creates a not found error.
   */
  static notFound(resource: string, context?: ErrorContext): AppError {
    return new AppError(
      `${resource} not found`,
      ErrorCode.NOT_FOUND,
      404,
      context
    );
  }
}

/**
 * Maps error codes to HTTP status codes.
 */
function getStatusCodeForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.TASK_NAME_INVALID:
    case ErrorCode.SCHEDULE_INVALID:
    case ErrorCode.SETTINGS_INVALID:
    case ErrorCode.CRON_EXPRESSION_INVALID:
      return 400;

    case ErrorCode.UNAUTHORIZED:
      return 401;

    case ErrorCode.FORBIDDEN:
      return 403;

    case ErrorCode.NOT_FOUND:
    case ErrorCode.TASK_NOT_FOUND:
    case ErrorCode.FAILURE_NOT_FOUND:
    case ErrorCode.FILE_NOT_FOUND:
      return 404;

    default:
      return 500;
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
