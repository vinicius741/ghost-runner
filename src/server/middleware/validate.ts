/**
 * Express validation middleware using Zod schemas.
 *
 * This module provides middleware functions that validate request
 * payloads using Zod schemas, returning structured error responses
 * for invalid inputs.
 *
 * @module server/middleware/validate
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation error response format.
 */
interface ValidationErrorResponse {
  error: string;
  details: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Formats Zod validation errors into a user-friendly format.
 */
function formatZodErrors(error: ZodError): ValidationErrorResponse {
  const details = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return {
    error: 'Validation failed',
    details,
  };
}

/**
 * Creates middleware that validates request body against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * import { runTaskSchema } from '../validators';
 *
 * app.post('/api/tasks/run', validateBody(runTaskSchema), handleRunTask);
 * ```
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorResponse = formatZodErrors(result.error);
      res.status(400).json(errorResponse);
      return;
    }

    // Replace req.body with the parsed and validated data
    req.body = result.data;
    next();
  };
}

/**
 * Creates middleware that validates request params against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errorResponse = formatZodErrors(result.error);
      res.status(400).json(errorResponse);
      return;
    }

    req.params = result.data as Record<string, string>;
    next();
  };
}

/**
 * Creates middleware that validates request query against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errorResponse = formatZodErrors(result.error);
      res.status(400).json(errorResponse);
      return;
    }

    req.query = result.data as Record<string, string | string[] | undefined>;
    next();
  };
}
