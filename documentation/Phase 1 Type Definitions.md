# Phase 1 Type Definitions

This document contains all TypeScript type definitions referenced in Phase 1 of the Development Execution Plan. These types should be used consistently across the codebase when implementing Phase 1 tasks.

**Related Documentation:** [Development Execution Plan](./Development Execution Plan.md)

---

## Section 1.1: Type Definitions & Interfaces

### File: `src/types/task.types.ts` (Task 1.1.1)

```typescript
/**
 * Task execution status - tracked via stdout markers during task execution.
 * Based on existing types from src/core/taskReporter.ts
 */
export type TaskStatus = 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED';

/**
 * Information about a task available from the task module and scheduler.
 */
export interface TaskInfo {
  /** Task name (filename without extension) */
  name: string;
  /** Task type - determines execution behavior */
  type: 'public' | 'private' | 'root';
  /** Whether task is currently running */
  running?: boolean;
  /** Last execution timestamp */
  lastRun?: string;
  /** Last execution status */
  lastStatus?: TaskStatus;
  /** Task metadata if available */
  metadata?: TaskMetadata;
}

/**
 * Child process representation for running tasks.
 * Used by TaskRunner service (Task 2.1.3) to manage task execution.
 */
export interface TaskProcess {
  /** Child process ID */
  pid: number;
  /** Task name being executed */
  taskName: string;
  /** Process start timestamp */
  startTime: string;
  /** Current process status */
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed';
  /** Child process reference (Node.js ChildProcess) */
  process?: unknown;
}

/**
 * Stream output from task execution for real-time log streaming.
 */
export interface TaskStream {
  /** Task name emitting this stream */
  taskName: string;
  /** Stream output line */
  output: string;
  /** Output timestamp */
  timestamp: string;
  /** Output type for styling */
  type: 'stdout' | 'stderr' | 'system';
}
```

### File: `src/core/page/types/page.types.ts` (Task 1.1.2)

```typescript
import type { Page, Locator } from '@playwright/test';

/**
 * Extended Playwright Page interface with monitoring capabilities.
 * Based on existing MonitoredPage from src/core/pageWrapper.ts
 */
export interface ExtendedPage {
  /** Get the original Playwright Page object */
  getOriginalPage(): Page;

  // Navigation methods
  goto(url: string, options?: Parameters<Page['goto']>[1]): Promise<void>;
  reload(options?: Parameters<Page['reload']>[0]): Promise<void>;
  waitForNavigation(options?: Parameters<Page['waitForNavigation']>[0]): Promise<void>;

  // Query methods
  $(selector: string): Promise<Locator | null>;
  $$(selector: string): Promise<Locator[]>;
  locator(selector: string): Locator;

  // Interaction methods
  click(selector: string, options?: Parameters<Page['click']>[1]): Promise<void>;
  fill(selector: string, value: string, options?: Parameters<Page['fill']>[1]): Promise<void>;
  type(selector: string, value: string, options?: Parameters<Page['type']>[1]): Promise<void>;
  hover(selector: string, options?: Parameters<Page['hover']>[1]): Promise<void>;

  // Waiting methods
  waitForSelector(selector: string, options?: Parameters<Page['waitForSelector']>[1]): Promise<void>;
  waitForTimeout(timeout: number): Promise<void>;

  // Media methods
  screenshot(options?: Parameters<Page['screenshot']>[0]): Promise<Buffer>;
  pdf(options?: Parameters<Page['pdf']>[0]): Promise<Buffer>;

  // Context methods
  setViewportSize(viewportSize: { width: number; height: number }): Promise<void>;
  close(): Promise<void>;
}

/**
 * Type-safe wrapper for any Playwright Page method.
 */
export type PageMethod = ExtendedPage[keyof ExtendedPage];

/**
 * Configuration options for creating a monitored page wrapper.
 */
export interface PageWrapperOptions {
  /** Name of the task using this page (for error reporting) */
  taskName: string;
  /** Default timeout for selector waits in milliseconds (default: 30000) */
  defaultSelectorTimeout?: number;
  /** Default timeout for navigation in milliseconds (default: 30000) */
  defaultNavigationTimeout?: number;
}
```

### File: `frontend/src/types/api.types.ts` (Task 1.1.3)

```typescript
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
```

---

## Section 1.2: Utility Function Types

### File: `frontend/src/utils/formatters.ts` (Task 1.2.1)

```typescript
/**
 * Format a timestamp for display in the dashboard.
 * @param timestamp - ISO timestamp string or Date object
 * @param format - Optional format specifier
 * @returns Formatted timestamp string
 */
export type TimestampFormatter = (
  timestamp: string | Date,
  format?: 'full' | 'time' | 'date' | 'relative'
) => string;

/**
 * Format a duration for display.
 * @param milliseconds - Duration in milliseconds
 * @param precision - Number of decimal places for seconds
 * @returns Formatted duration string (e.g., "1.5s", "500ms")
 */
export type DurationFormatter = (
  milliseconds: number,
  precision?: number
) => string;
```

### File: `frontend/src/utils/styleHelpers.ts` (Task 1.2.2)

```typescript
import type { Failure } from './types/api.types';

/**
 * Get the color class for a specific error type.
 * @param errorType - The type of error
 * @returns Tailwind CSS color class name
 */
export type ErrorColorGetter = (
  errorType: Failure['errorType'] | 'unknown'
) => string;

/**
 * Get the icon name for a specific error type.
 * @param errorType - The type of error
 * @returns Icon component name or identifier
 */
export type ErrorIconGetter = (
  errorType: Failure['errorType'] | 'unknown'
) => string;
```

### File: `src/server/utils/taskValidators.ts` (Task 1.2.3)

```typescript
/**
 * Validate that a task name is safe to execute.
 * Prevents directory traversal and command injection attacks.
 * @param taskName - The task name to validate
 * @returns True if the task name is valid
 */
export type TaskNameValidator = (taskName: unknown) => boolean;

/**
 * Type guard to check if a value is a valid task name string.
 * @param value - Value to check
 * @returns True if value is a valid task name string
 */
export type IsTaskName = (value: unknown): value is string;
```

### File: `src/server/utils/taskParser.ts` (Task 1.2.4)

```typescript
import type { TaskStatus, InfoGatheringDataType } from './task.types';

/**
 * Parsed task status result from stdout marker parsing.
 */
export interface ParsedTaskStatus {
  /** The parsed status marker */
  status: TaskStatus;
  /** Additional data from the status marker */
  data: TaskStatusData;
}

/**
 * Data extracted from task status markers.
 */
export interface TaskStatusData {
  /** Task name from the status marker */
  taskName?: string;
  /** Timestamp when the status was emitted */
  timestamp?: string;
  /** Error type if task failed */
  errorType?: string;
  /** Error message if task failed */
  errorMessage?: string;
  /** Additional error context */
  errorContext?: Record<string, unknown>;
  /** Task result data (for COMPLETED_WITH_DATA status) */
  data?: unknown;
  /** Metadata for info-gathering tasks */
  metadata?: InfoGatheringMetadata;
}

/**
 * Valid data type options for info-gathering task results.
 * Determines how the data should be rendered in the UI.
 */
export type InfoGatheringDataType = 'key-value' | 'table' | 'custom';

/**
 * Metadata for info-gathering task results.
 */
export interface InfoGatheringMetadata {
  /** Category for grouping in the dashboard */
  category?: string;
  /** Human-readable display name */
  displayName?: string;
  /** Data type for rendering - determines how the data should be displayed */
  dataType?: InfoGatheringDataType;
  /** Time-to-live for cached data (milliseconds) */
  ttl?: number;
}
```

---

## Section 1.3: Custom Hook Types

### File: `frontend/src/hooks/useApi.ts` (Task 1.3.1)

```typescript
/**
 * Options for configuring the useApi hook behavior.
 */
export interface UseApiOptions<TData = unknown> {
  /** Abort request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include with every request */
  headers?: Record<string, string>;
  /** Callback called on successful fetch */
  onSuccess?: (data: TData) => void;
  /** Callback called on fetch error */
  onError?: (error: Error) => void;
}

/**
 * Return type for the useApi hook.
 * Provides a generic API client with loading, error, and data states.
 */
export interface UseApiResult<TData> {
  /** Fetch data from an API endpoint */
  fetch: (url: string, init?: RequestInit) => Promise<TData>;
  /** Current data state */
  data: TData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Abort the current request */
  abort: () => void;
  /** Reset state to initial values */
  reset: () => void;
}
```

### File: `frontend/src/hooks/useSocket.ts` (Task 1.3.2)

```typescript
import type { Socket } from 'socket.io-client';

/**
 * Socket.io event handler with proper typing.
 */
export type SocketEventHandler<T = unknown> = (data: T) => void;

/**
 * Return type for the useSocket hook.
 * Provides a typed Socket.io client with auto-reconnect.
 */
export interface UseSocketResult {
  /** Socket.io client instance */
  socket: Socket | null;
  /** Connection state */
  connected: boolean;
  /** Register an event handler */
  on: <T = unknown>(event: string, handler: SocketEventHandler<T>) => void;
  /** Remove an event handler */
  off: <T = unknown>(event: string, handler: SocketEventHandler<T>) => void;
  /** Emit an event to the server */
  emit: <T = unknown>(event: string, data?: T) => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}
```

### File: `frontend/src/hooks/useScheduler.ts` (Task 1.3.3)

```typescript
/**
 * Return type for the useScheduler hook.
 * Provides scheduler control with optimistic updates.
 */
export interface UseSchedulerResult {
  /** Current scheduler status */
  status: 'running' | 'stopped' | 'unknown';
  /** Start the scheduler */
  start: () => Promise<void>;
  /** Stop the scheduler */
  stop: () => Promise<void>;
  /** Refresh scheduler status */
  refresh: () => Promise<void>;
  /** Loading state for operations */
  loading: boolean;
  /** Error state */
  error: string | null;
}
```

### File: `frontend/src/hooks/useFailureFilters.ts` (Task 1.3.4)

```typescript
import type { Failure } from './types/api.types';

/**
 * Filter options for the failures panel.
 */
export interface FailureFilters {
  /** Filter by error type */
  errorType?: Failure['errorType'] | 'all';
  /** Filter by task name */
  taskName?: string;
  /** Show only active (non-dismissed) failures */
  activeOnly?: boolean;
  /** Search query for context/message */
  searchQuery?: string;
}

/**
 * Return type for the useFailureFilters hook.
 */
export interface UseFailureFiltersResult {
  /** Current filter settings */
  filters: FailureFilters;
  /** Update filter settings */
  setFilters: (filters: Partial<FailureFilters>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Filtered failures array */
  filteredFailures: Failure[];
  /** Count of failures matching current filters */
  filteredCount: number;
}
```

### File: `frontend/src/hooks/useFailureStyles.ts` (Task 1.3.5)

```typescript
import type { Failure } from './types/api.types';

/**
 * Style configuration for failure cards.
 */
export interface FailureStyleConfig {
  /** CSS class for the card border */
  borderClass: string;
  /** CSS class for the icon */
  iconClass: string;
  /** CSS class for the background */
  bgClass: string;
  /** CSS class for the text */
  textClass: string;
}

/**
 * Return type for the useFailureStyles hook.
 */
export interface UseFailureStylesResult {
  /** Get styles for a specific failure type */
  getStyles: (errorType: Failure['errorType'] | 'unknown') => FailureStyleConfig;
  /** Get color for a specific failure type */
  getColor: (errorType: Failure['errorType'] | 'unknown') => string;
  /** Get icon for a specific failure type */
  getIcon: (errorType: Failure['errorType'] | 'unknown') => string;
}
```

---

## Section 1.4: Error Handling Types

### Existing: `src/core/errors.ts` (Referenced in Task 1.4)

```typescript
/**
 * Base class for all task-related errors.
 * (Already exists in src/core/errors.ts)
 */
export abstract class TaskError extends Error {
  readonly timestamp: string;
  readonly taskName: string;
  readonly errorType: string;

  constructor(message: string, taskName: string, errorType: string);
  toJSON(): Record<string, unknown>;
  protected abstract getContext(): Record<string, unknown>;
}

/**
 * Error thrown when a selector cannot be found within the timeout.
 */
export class ElementNotFoundError extends TaskError {
  readonly selector: string;
  readonly timeout: number;
  readonly pageUrl?: string;

  constructor(selector: string, timeout: number, taskName: string, pageUrl?: string);
  protected getContext(): Record<string, unknown>;
}

/**
 * Error thrown when page navigation fails.
 */
export class NavigationFailureError extends TaskError {
  readonly url: string;
  readonly details?: string;
  readonly responseStatus?: number;

  constructor(url: string, taskName: string, details?: string, responseStatus?: number);
  protected getContext(): Record<string, unknown>;
}

/**
 * Error thrown when a task exceeds its timeout limit.
 */
export class TaskTimeoutError extends TaskError {
  readonly timeout: number;
  readonly unit: string;

  constructor(taskName: string, timeout: number, unit?: string);
  protected getContext(): Record<string, unknown>;
}

/**
 * Type guard to check if an error is a TaskError.
 */
export function isTaskError(error: unknown): error is TaskError;
```

### New: Error Boundary Types (Task 1.4.1)

```typescript
import type { ReactNode, ComponentType } from 'react';

/**
 * Props for the error boundary component.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ComponentType<{ error: unknown; reset: () => void }>;
  /** Callback when an error is caught */
  onError?: (error: unknown, errorInfo: { componentStack: string }) => void;
}

/**
 * State for the error boundary component.
 */
export interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that was caught */
  error: unknown;
}

/**
 * Toast notification for API errors.
 */
export interface ApiErrorToast {
  /** Error message to display */
  message: string;
  /** Error severity level */
  severity: 'error' | 'warning' | 'info';
  /** Auto-dismiss timeout (ms) */
  timeout?: number;
  /** Unique identifier */
  id: string;
}
```

---

## Shared Types

```typescript
import type { Page } from '@playwright/test';

/**
 * Task metadata exported from task modules.
 */
export interface TaskMetadata {
  /** Task type - 'action' for side-effect tasks, 'info-gathering' for data-returning */
  type?: 'action' | 'info-gathering';
  /** Category for grouping in UI */
  category?: string;
  /** Human-readable display name */
  displayName?: string;
  /** How to render the data in UI (for info-gathering tasks) */
  dataType?: 'key-value' | 'table' | 'custom';
  /** Time-to-live for cached data in milliseconds (default 7 days) */
  ttl?: number;
}

/**
 * Task result from execution.
 */
export interface TaskResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Task name */
  taskName: string;
  /** Timestamp of completion */
  timestamp: string;
  /** Error type if task failed */
  errorType?: string;
  /** Additional error context */
  errorContext?: Record<string, unknown>;
  /** Error message */
  errorMessage?: string;
}

/**
 * Task module interface.
 * All tasks must export a `run` function matching this interface.
 */
export interface TaskModule {
  /** Main task execution function */
  run: (page: Page) => Promise<void | unknown>;
  /** Optional metadata about the task */
  metadata?: TaskMetadata;
}
```

---

## Usage Notes

### Importing Types

When implementing Phase 1 tasks, import types from their respective locations:

```typescript
// Backend types
import type { TaskStatus, TaskInfo } from '../types/task.types';
import type { ExtendedPage, PageWrapperOptions } from '../core/page/types/page.types';

// Frontend types
import type { Task, ScheduleItem, Failure } from './types/api.types';
import type { UseApiResult, UseSocketResult } from './hooks';
```

### Type Guards

Use the provided type guards for runtime type checking:

```typescript
import { isTaskName } from '../utils/taskValidators';

if (isTaskName(userInput)) {
  // userInput is now typed as string
  executeTask(userInput);
}
```

---

*Version: 1.0.0*
*Last Updated: 2026-01-28*
