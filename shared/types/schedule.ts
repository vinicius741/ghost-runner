/**
 * Shared schedule type definitions.
 *
 * These types are used across the backend (scheduler, controllers, server)
 * and frontend (dashboard components).
 *
 * @module shared/types/schedule
 */

/**
 * Schedule item for task scheduling.
 *
 * Supports two scheduling modes:
 * - cron: Recurring tasks using cron expressions
 * - executeAt: One-time tasks at a specific datetime
 */
export interface ScheduleItem {
  /** Name of the task to execute */
  task: string;
  /** Cron expression for recurring tasks (e.g., "0 9 * * *" for daily at 9am) */
  cron?: string;
  /** ISO timestamp for one-time task execution */
  executeAt?: string;
  /** Whether the schedule entry is enabled (optional, defaults to true) */
  enabled?: boolean;
}

/**
 * Next scheduled task information.
 * Used by the timer component to display countdown.
 */
export interface NextTask {
  /** Name of the task */
  task: string;
  /** ISO timestamp of next execution */
  nextRun: string;
  /** Delay in milliseconds from now until next execution */
  delayMs: number;
}

/**
 * Schedule update event payload.
 * Emitted via Socket.io when schedule.json changes.
 */
export interface ScheduleUpdatePayload {
  /** Updated schedule array */
  schedule: ScheduleItem[];
}
