/**
 * API Types for Ghost Runner Frontend
 *
 * This file contains type definitions for all API responses and requests.
 * Extracted from App.tsx and centralized for better maintainability.
 *
 * Related: Development Execution Plan Task 1.1.3
 */

/**
 * Task definition as returned from the tasks API.
 */
export interface Task {
  /** Task name (filename without extension) */
  name: string;
  /** Task type - determines file location */
  type: 'public' | 'private' | 'root';
  /** Whether task is currently running (runtime status) */
  running?: boolean;
  /** Last run timestamp if available */
  lastRun?: string;
}

/**
 * Schedule item for the scheduler.
 * Supports both recurring (cron) and one-time (executeAt) scheduling.
 */
export interface ScheduleItem {
  /** Task name to schedule */
  task: string;
  /** Optional cron expression for recurring tasks */
  cron?: string;
  /** ISO timestamp for one-time execution */
  executeAt?: string;
}

/**
 * Failure record from the failures tracking system.
 */
export interface Failure {
  /** Unique identifier for this failure record */
  id: string;
  /** Name of the task that failed */
  taskName: string;
  /** Type of error that occurred */
  errorType: 'element_not_found' | 'navigation_failure' | 'timeout' | 'unknown';
  /** Additional context about the failure */
  context: Record<string, unknown>;
  /** When the failure first occurred */
  timestamp: string;
  /** Number of times this failure has occurred (24h deduplication) */
  count: number;
  /** When this failure was last seen */
  lastSeen: string;
  /** Whether the user has dismissed this failure */
  dismissed?: boolean;
}

/**
 * Log entry for the logs console.
 */
export interface LogEntry {
  /** Log message content */
  message: string;
  /** Timestamp of the log entry */
  timestamp: string;
  /** Type of log for styling */
  type: 'normal' | 'error' | 'system';
}

/**
 * API response wrapper for error handling.
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** Success flag */
  success?: boolean;
}

/**
 * API error details for user display.
 */
export interface ApiError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status?: number;
  /** Error type for categorization */
  type?: 'network' | 'server' | 'client' | 'timeout';
}

/**
 * Tasks API response.
 */
export interface TasksResponse {
  /** List of available tasks */
  tasks: Task[];
}

/**
 * Schedule API response.
 */
export interface ScheduleResponse {
  /** Current schedule configuration */
  schedule: ScheduleItem[];
}

/**
 * Failures API response.
 */
export interface FailuresResponse {
  /** List of failure records */
  failures: Failure[];
}

/**
 * Scheduler status API response.
 */
export interface SchedulerStatusResponse {
  /** Whether the scheduler is currently running */
  running: boolean;
}

/**
 * Settings API response.
 */
export interface SettingsResponse {
  /** Current application settings */
  settings: {
    geolocation: {
      latitude: number;
      longitude: number;
    };
    headless?: boolean;
    profileDir?: string;
    browserChannel?: string;
    executablePath?: string;
  };
}
