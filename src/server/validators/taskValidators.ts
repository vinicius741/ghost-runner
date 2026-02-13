/**
 * Zod validation schemas for task-related API endpoints.
 *
 * These schemas provide runtime validation for request payloads,
 * ensuring type safety and clear error messages.
 *
 * @module server/validators/taskValidators
 */

import { z } from 'zod';

export const MAX_TASK_CONTENT_SIZE = 500_000;

/**
 * Task type enum schema.
 */
export const taskTypeSchema = z.enum(['public', 'private', 'root'], {
  errorMap: () => ({ message: 'Task type must be "public", "private", or "root"' }),
});

/**
 * Task name validation schema.
 * Must be alphanumeric with hyphens and underscores, 1-100 characters.
 */
export const taskNameSchema = z
  .string()
  .min(1, 'Task name is required')
  .max(100, 'Task name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Task name can only contain letters, numbers, hyphens, and underscores')
  .refine(
    (name) => !name.includes('..') && !name.includes('/') && !name.includes('\\'),
    'Task name contains invalid path traversal sequences'
  );

/**
 * Request body schema for POST /api/tasks/run
 */
export const runTaskSchema = z.object({
  taskName: taskNameSchema,
});

/**
 * Request body schema for POST /api/record
 */
export const recordTaskSchema = z.object({
  taskName: taskNameSchema,
  type: taskTypeSchema.optional().default('private'),
});

/**
 * Request body schema for POST /api/upload-task
 */
export const uploadTaskSchema = z.object({
  taskName: taskNameSchema,
  type: z.enum(['public', 'private'], {
    errorMap: () => ({ message: 'Task type must be "public" or "private"' }),
  }),
  content: z
    .string()
    .min(1, 'Task content is required')
    .max(MAX_TASK_CONTENT_SIZE, 'Task content is too large (max 500KB)'),
});

/**
 * Type exports for inferred types
 */
export type RunTaskInput = z.infer<typeof runTaskSchema>;
export type RecordTaskInput = z.infer<typeof recordTaskSchema>;
export type UploadTaskInput = z.infer<typeof uploadTaskSchema>;
