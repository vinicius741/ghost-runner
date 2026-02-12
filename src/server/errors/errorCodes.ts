/**
 * Centralized error codes for the Ghost Runner backend.
 *
 * These codes provide machine-readable identifiers for errors,
 * enabling programmatic error handling on the client side.
 *
 * @module server/errors/errorCodes
 */

/**
 * All error codes used in the application.
 */
export enum ErrorCode {
  // Generic errors (1xxx)
  INTERNAL_ERROR = 'ERR_1000',
  VALIDATION_ERROR = 'ERR_1001',
  NOT_FOUND = 'ERR_1002',
  UNAUTHORIZED = 'ERR_1003',
  FORBIDDEN = 'ERR_1004',

  // Task errors (2xxx)
  TASK_NOT_FOUND = 'ERR_2000',
  TASK_EXECUTION_FAILED = 'ERR_2001',
  TASK_NAME_INVALID = 'ERR_2002',
  TASK_ALREADY_RUNNING = 'ERR_2003',

  // Schedule errors (3xxx)
  SCHEDULE_INVALID = 'ERR_3000',
  SCHEDULE_SAVE_FAILED = 'ERR_3001',
  SCHEDULE_READ_FAILED = 'ERR_3002',
  CRON_EXPRESSION_INVALID = 'ERR_3003',

  // Settings errors (4xxx)
  SETTINGS_INVALID = 'ERR_4000',
  SETTINGS_SAVE_FAILED = 'ERR_4001',
  SETTINGS_READ_FAILED = 'ERR_4002',

  // Failure tracking errors (5xxx)
  FAILURE_NOT_FOUND = 'ERR_5000',
  FAILURE_DISMISS_FAILED = 'ERR_5001',

  // File system errors (6xxx)
  FILE_NOT_FOUND = 'ERR_6000',
  FILE_READ_ERROR = 'ERR_6001',
  FILE_WRITE_ERROR = 'ERR_6002',

  // Scheduler errors (7xxx)
  SCHEDULER_ALREADY_RUNNING = 'ERR_7000',
  SCHEDULER_NOT_RUNNING = 'ERR_7001',
  SCHEDULER_START_FAILED = 'ERR_7002',
}

/**
 * Human-readable messages for error codes.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected internal error occurred',
  [ErrorCode.VALIDATION_ERROR]: 'The request data is invalid',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCode.UNAUTHORIZED]: 'Authentication is required',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',

  [ErrorCode.TASK_NOT_FOUND]: 'The specified task was not found',
  [ErrorCode.TASK_EXECUTION_FAILED]: 'Task execution failed',
  [ErrorCode.TASK_NAME_INVALID]: 'The task name is invalid',
  [ErrorCode.TASK_ALREADY_RUNNING]: 'The task is already running',

  [ErrorCode.SCHEDULE_INVALID]: 'The schedule configuration is invalid',
  [ErrorCode.SCHEDULE_SAVE_FAILED]: 'Failed to save the schedule',
  [ErrorCode.SCHEDULE_READ_FAILED]: 'Failed to read the schedule',
  [ErrorCode.CRON_EXPRESSION_INVALID]: 'The cron expression is invalid',

  [ErrorCode.SETTINGS_INVALID]: 'The settings configuration is invalid',
  [ErrorCode.SETTINGS_SAVE_FAILED]: 'Failed to save settings',
  [ErrorCode.SETTINGS_READ_FAILED]: 'Failed to read settings',

  [ErrorCode.FAILURE_NOT_FOUND]: 'The failure record was not found',
  [ErrorCode.FAILURE_DISMISS_FAILED]: 'Failed to dismiss the failure',

  [ErrorCode.FILE_NOT_FOUND]: 'The file was not found',
  [ErrorCode.FILE_READ_ERROR]: 'Failed to read the file',
  [ErrorCode.FILE_WRITE_ERROR]: 'Failed to write to the file',

  [ErrorCode.SCHEDULER_ALREADY_RUNNING]: 'The scheduler is already running',
  [ErrorCode.SCHEDULER_NOT_RUNNING]: 'The scheduler is not running',
  [ErrorCode.SCHEDULER_START_FAILED]: 'Failed to start the scheduler',
};
