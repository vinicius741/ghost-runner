/**
 * Express error handling middleware.
 *
 * Provides centralized error handling for the application,
 * logging errors and returning appropriate HTTP responses.
 *
 * @module server/middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError } from '../errors/AppError';
import { ErrorCode } from '../errors/errorCodes';
import { logger } from '../utils/logger';

/**
 * Error response format for API responses.
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: Array<{
    path: string;
    message: string;
  }>;
  stack?: string;
}

/**
 * Formats a Zod error into a structured response.
 */
function formatZodError(error: ZodError): ErrorResponse {
  return {
    error: 'Validation failed',
    code: ErrorCode.VALIDATION_ERROR,
    details: error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Converts unknown errors to AppError instances.
 */
function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      400,
      { zodErrors: error.errors }
    );
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      { originalError: error.name },
      false // Not operational - programming error
    );
  }

  // Unknown error type
  return new AppError(
    'An unexpected error occurred',
    ErrorCode.INTERNAL_ERROR,
    500,
    { rawError: String(error) },
    false
  );
}

/**
 * Global error handling middleware.
 * Should be registered last in the middleware chain.
 *
 * @example
 * ```ts
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appError = normalizeError(err);

  // Log the error
  if (appError.isOperational) {
    // Operational errors are expected - log at warn level
    logger.warn('Operational error', {
      code: appError.code,
      message: appError.message,
      path: req.path,
      method: req.method,
      context: appError.context,
    });
  } else {
    // Programming errors are unexpected - log at error level with stack
    logger.error('Unexpected error', {
      code: appError.code,
      message: appError.message,
      path: req.path,
      method: req.method,
      context: appError.context,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  // Build response
  const response: ErrorResponse = {
    error: appError.message,
    code: appError.code,
  };

  // Include Zod error details if present
  if (err instanceof ZodError) {
    response.details = formatZodError(err).details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    response.stack = err.stack;
  }

  // Send response
  res.status(appError.statusCode).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: ErrorCode.NOT_FOUND,
  });
}
