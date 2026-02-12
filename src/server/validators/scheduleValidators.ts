/**
 * Zod validation schemas for schedule-related API endpoints.
 *
 * @module server/validators/scheduleValidators
 */

import { z } from 'zod';

/**
 * Task name validation schema.
 */
const taskNameField = z
  .string()
  .min(1, 'Task name is required')
  .max(100, 'Task name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Task name can only contain letters, numbers, hyphens, and underscores');

/**
 * Cron expression validation schema.
 * Basic validation - actual cron validation happens in node-cron.
 */
const cronExpressionSchema = z
  .string()
  .min(9, 'Cron expression is too short')
  .max(100, 'Cron expression is too long')
  .optional();

/**
 * ISO timestamp schema for one-time task execution.
 */
const executeAtSchema = z
  .string()
  .datetime({ message: 'executeAt must be a valid ISO 8601 datetime string' })
  .optional();

/**
 * Single schedule item schema.
 * Must have either cron or executeAt, but not both.
 */
export const scheduleItemSchema = z.object({
  task: taskNameField,
  cron: cronExpressionSchema,
  executeAt: executeAtSchema,
  enabled: z.boolean().optional().default(true),
}).refine(
  (data) => data.cron !== undefined || data.executeAt !== undefined,
  {
    message: 'Schedule item must have either cron or executeAt',
    path: ['cron'],
  }
);

/**
 * Full schedule array schema.
 */
export const scheduleArraySchema = z.array(scheduleItemSchema);

/**
 * Request body schema for PUT /api/schedule
 */
export const saveScheduleSchema = z.object({
  schedule: scheduleArraySchema,
});

/**
 * Type exports for inferred types
 */
export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;
export type SaveScheduleInput = z.infer<typeof saveScheduleSchema>;
