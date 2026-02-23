/**
 * Unit tests for core error types.
 *
 * Tests custom error classes for task failure detection.
 *
 * @module test/unit/core/errors.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TaskError,
  ElementNotFoundError,
  NavigationFailureError,
  TaskTimeoutError,
  isTaskError,
} from '../../../src/core/errors';

describe('errors', () => {
  describe('ElementNotFoundError', () => {
    it('should create error with required properties', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task');

      assert.strictEqual(error.name, 'ElementNotFoundError');
      assert.strictEqual(error.selector, '#my-button');
      assert.strictEqual(error.timeout, 5000);
      assert.strictEqual(error.taskName, 'my-task');
      assert.strictEqual(error.errorType, 'element_not_found');
    });

    it('should include selector and timeout in message', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task');

      assert.ok(error.message.includes('#my-button'));
      assert.ok(error.message.includes('5000ms'));
    });

    it('should include page URL in message when provided', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task', 'https://example.com/page');

      assert.ok(error.message.includes('https://example.com/page'));
      assert.strictEqual(error.pageUrl, 'https://example.com/page');
    });

    it('should work without page URL', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task');

      assert.strictEqual(error.pageUrl, undefined);
      assert.ok(!error.message.includes('on '));
    });

    it('should have timestamp', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task');

      assert.ok(error.timestamp);
      assert.ok(new Date(error.timestamp).getTime() > 0);
    });

    it('should serialize to JSON with toJSON()', () => {
      const error = new ElementNotFoundError('#my-button', 5000, 'my-task', 'https://example.com');
      const json = error.toJSON();

      assert.strictEqual(json.name, 'ElementNotFoundError');
      assert.strictEqual(json.message, error.message);
      assert.strictEqual(json.errorType, 'element_not_found');
      assert.strictEqual(json.taskName, 'my-task');
      assert.strictEqual(json.selector, '#my-button');
      assert.strictEqual(json.timeout, 5000);
      assert.strictEqual(json.pageUrl, 'https://example.com');
      assert.ok(json.timestamp);
    });
  });

  describe('NavigationFailureError', () => {
    it('should create error with URL and task name', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task');

      assert.strictEqual(error.name, 'NavigationFailureError');
      assert.strictEqual(error.url, 'https://example.com');
      assert.strictEqual(error.taskName, 'my-task');
      assert.strictEqual(error.errorType, 'navigation_failure');
    });

    it('should include URL in message', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task');

      assert.ok(error.message.includes('https://example.com'));
    });

    it('should include details when provided', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task', 'Connection refused');

      assert.strictEqual(error.details, 'Connection refused');
      assert.ok(error.message.includes('Connection refused'));
    });

    it('should include response status when provided', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task', 'Not found', 404);

      assert.strictEqual(error.responseStatus, 404);
      assert.ok(error.message.includes('404'));
    });

    it('should work without optional parameters', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task');

      assert.strictEqual(error.details, undefined);
      assert.strictEqual(error.responseStatus, undefined);
    });

    it('should have timestamp', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task');

      assert.ok(error.timestamp);
    });

    it('should serialize to JSON with toJSON()', () => {
      const error = new NavigationFailureError('https://example.com', 'my-task', 'Timeout', 504);
      const json = error.toJSON();

      assert.strictEqual(json.name, 'NavigationFailureError');
      assert.strictEqual(json.url, 'https://example.com');
      assert.strictEqual(json.details, 'Timeout');
      assert.strictEqual(json.responseStatus, 504);
      assert.strictEqual(json.taskName, 'my-task');
      assert.strictEqual(json.errorType, 'navigation_failure');
    });
  });

  describe('TaskTimeoutError', () => {
    it('should create error with task name and timeout', () => {
      const error = new TaskTimeoutError('my-task', 60000);

      assert.strictEqual(error.name, 'TaskTimeoutError');
      assert.strictEqual(error.taskName, 'my-task');
      assert.strictEqual(error.timeout, 60000);
      assert.strictEqual(error.errorType, 'timeout');
    });

    it('should include task name and timeout in message', () => {
      const error = new TaskTimeoutError('my-task', 60000);

      assert.ok(error.message.includes('my-task'));
      assert.ok(error.message.includes('60000'));
    });

    it('should use default unit (ms)', () => {
      const error = new TaskTimeoutError('my-task', 60000);

      assert.strictEqual(error.unit, 'ms');
      assert.ok(error.message.includes('60000ms'));
    });

    it('should accept custom unit', () => {
      const error = new TaskTimeoutError('my-task', 60, 's');

      assert.strictEqual(error.unit, 's');
      assert.ok(error.message.includes('60s'));
    });

    it('should have timestamp', () => {
      const error = new TaskTimeoutError('my-task', 60000);

      assert.ok(error.timestamp);
    });

    it('should serialize to JSON with toJSON()', () => {
      const error = new TaskTimeoutError('my-task', 60, 's');
      const json = error.toJSON();

      assert.strictEqual(json.name, 'TaskTimeoutError');
      assert.strictEqual(json.timeout, 60);
      assert.strictEqual(json.unit, 's');
      assert.strictEqual(json.taskName, 'my-task');
      assert.strictEqual(json.errorType, 'timeout');
    });
  });

  describe('isTaskError', () => {
    it('should return true for ElementNotFoundError', () => {
      const error = new ElementNotFoundError('#button', 5000, 'task');
      assert.strictEqual(isTaskError(error), true);
    });

    it('should return true for NavigationFailureError', () => {
      const error = new NavigationFailureError('https://example.com', 'task');
      assert.strictEqual(isTaskError(error), true);
    });

    it('should return true for TaskTimeoutError', () => {
      const error = new TaskTimeoutError('task', 60000);
      assert.strictEqual(isTaskError(error), true);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');
      assert.strictEqual(isTaskError(error), false);
    });

    it('should return false for TypeError', () => {
      const error = new TypeError('Type error');
      assert.strictEqual(isTaskError(error), false);
    });

    it('should return false for non-Error values', () => {
      assert.strictEqual(isTaskError('error string'), false);
      assert.strictEqual(isTaskError(null), false);
      assert.strictEqual(isTaskError(undefined), false);
      assert.strictEqual(isTaskError({ message: 'error' }), false);
    });

    it('should work with error caught in catch block', () => {
      let caughtError: unknown;

      try {
        throw new ElementNotFoundError('#button', 5000, 'task');
      } catch (e) {
        caughtError = e;
      }

      assert.strictEqual(isTaskError(caughtError), true);
    });
  });

  describe('TaskError base class', () => {
    it('should be abstract (cannot instantiate directly)', () => {
      // TypeScript prevents instantiation, but at runtime we can check
      // that the concrete classes inherit properly
      const error = new ElementNotFoundError('#button', 5000, 'task');
      assert.ok(error instanceof TaskError);
      assert.ok(error instanceof Error);
    });

    it('should set error name to constructor name', () => {
      const elementError = new ElementNotFoundError('#button', 5000, 'task');
      assert.strictEqual(elementError.name, 'ElementNotFoundError');

      const navError = new NavigationFailureError('https://example.com', 'task');
      assert.strictEqual(navError.name, 'NavigationFailureError');

      const timeoutError = new TaskTimeoutError('task', 60000);
      assert.strictEqual(timeoutError.name, 'TaskTimeoutError');
    });

    it('should have stack trace', () => {
      const error = new ElementNotFoundError('#button', 5000, 'task');
      assert.ok(error.stack);
      assert.ok(error.stack?.includes('ElementNotFoundError'));
    });
  });

  describe('error context extraction', () => {
    it('should extract element selector context', () => {
      const error = new ElementNotFoundError('#submit-button', 30000, 'checkout-task');
      const context = error.toJSON();

      assert.strictEqual(context.selector, '#submit-button');
      assert.strictEqual(context.timeout, 30000);
    });

    it('should extract navigation context', () => {
      const error = new NavigationFailureError(
        'https://api.example.com/data',
        'api-task',
        'ECONNREFUSED',
        503
      );
      const context = error.toJSON();

      assert.strictEqual(context.url, 'https://api.example.com/data');
      assert.strictEqual(context.details, 'ECONNREFUSED');
      assert.strictEqual(context.responseStatus, 503);
    });
  });
});
