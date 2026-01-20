/**
 * Custom error types for task failure detection.
 * These errors provide structured context about what went wrong during task execution.
 */

/**
 * Base class for all task-related errors.
 * Includes timestamp and task name for tracking.
 */
export abstract class TaskError extends Error {
  readonly timestamp: string;
  readonly taskName: string;
  readonly errorType: string;

  constructor(message: string, taskName: string, errorType: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.taskName = taskName;
    this.errorType = errorType;
  }

  /**
   * Serializes the error to a plain object for JSON encoding.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      taskName: this.taskName,
      timestamp: this.timestamp,
      ...this.getContext(),
    };
  }

  /**
   * Subclasses must implement to provide error-specific context.
   */
  protected abstract getContext(): Record<string, unknown>;
}

/**
 * Thrown when a selector cannot be found within the timeout period.
 * Indicates that the website structure may have changed.
 */
export class ElementNotFoundError extends TaskError {
  readonly selector: string;
  readonly timeout: number;
  readonly pageUrl?: string;

  constructor(selector: string, timeout: number, taskName: string, pageUrl?: string) {
    const message = pageUrl
      ? `Element not found: selector '${selector}' did not appear within ${timeout}ms on ${pageUrl}`
      : `Element not found: selector '${selector}' did not appear within ${timeout}ms`;
    super(message, taskName, 'element_not_found');
    this.selector = selector;
    this.timeout = timeout;
    this.pageUrl = pageUrl;
  }

  protected getContext(): Record<string, unknown> {
    return {
      selector: this.selector,
      timeout: this.timeout,
      pageUrl: this.pageUrl,
    };
  }
}

/**
 * Thrown when navigation fails (goto, waitForNavigation, etc.).
 * Indicates network issues or website structure changes.
 */
export class NavigationFailureError extends TaskError {
  readonly url: string;
  readonly details?: string;
  readonly responseStatus?: number;

  constructor(url: string, taskName: string, details?: string, responseStatus?: number) {
    const message = responseStatus
      ? `Navigation failed to ${url} (status: ${responseStatus})${details ? `: ${details}` : ''}`
      : `Navigation failed to ${url}${details ? `: ${details}` : ''}`;
    super(message, taskName, 'navigation_failure');
    this.url = url;
    this.details = details;
    this.responseStatus = responseStatus;
  }

  protected getContext(): Record<string, unknown> {
    return {
      url: this.url,
      details: this.details,
      responseStatus: this.responseStatus,
    };
  }
}

/**
 * Thrown when a task takes longer than the maximum allowed time.
 */
export class TaskTimeoutError extends TaskError {
  readonly timeout: number;
  readonly unit: string;

  constructor(taskName: string, timeout: number, unit: string = 'ms') {
    super(`Task '${taskName}' timed out after ${timeout}${unit}`, taskName, 'timeout');
    this.timeout = timeout;
    this.unit = unit;
  }

  protected getContext(): Record<string, unknown> {
    return {
      timeout: this.timeout,
      unit: this.unit,
    };
  }
}

/**
 * Utility to check if an error is one of our custom TaskError types.
 */
export function isTaskError(error: unknown): error is TaskError {
  return (
    error instanceof ElementNotFoundError ||
    error instanceof NavigationFailureError ||
    error instanceof TaskTimeoutError
  );
}
