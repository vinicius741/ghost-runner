/**
 * Unit tests for errorHandler utilities.
 *
 * Tests Express controller error handling.
 *
 * @module test/unit/utils/errorHandler.test
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { handleControllerError, getErrorMessage } from '../../../src/server/utils/errorHandler';
import type { Response } from 'express';

describe('errorHandler', () => {
  let mockRes: Response;
  let mockStatus: ReturnType<typeof mock.fn>;
  let mockJson: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    mockStatus = mock.fn(() => mockRes);
    mockJson = mock.fn();
    mockRes = {
      status: mockStatus,
      json: mockJson,
    } as unknown as Response;
  });

  describe('handleControllerError', () => {
    it('should respond with 500 status and error message', () => {
      const error = new Error('Test error message');

      handleControllerError(error, mockRes);

      assert.strictEqual(mockStatus.mock.callCount(), 1);
      assert.deepStrictEqual(mockStatus.mock.calls[0].arguments, [500]);
      assert.strictEqual(mockJson.mock.callCount(), 1);
    });

    it('should include error message in response', () => {
      const error = new Error('Something went wrong');

      handleControllerError(error, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(jsonResponse.error.includes('Something went wrong'));
      assert.ok(jsonResponse.error.includes('Internal Server Error'));
    });

    it('should handle non-Error errors', () => {
      const error = 'string error';

      handleControllerError(error, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(jsonResponse.error.includes('Unknown error'));
    });

    it('should handle null errors', () => {
      handleControllerError(null, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(jsonResponse.error.includes('Unknown error'));
    });

    it('should handle undefined errors', () => {
      handleControllerError(undefined, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(jsonResponse.error.includes('Unknown error'));
    });

    it('should handle number errors', () => {
      handleControllerError(42, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(jsonResponse.error.includes('Unknown error'));
    });

    it('should log error with context when provided', () => {
      const consoleSpy = mock.method(console, 'error', () => {});
      const error = new Error('Test error');

      handleControllerError(error, mockRes, 'Error in /api/tasks/run');

      assert.strictEqual(consoleSpy.mock.callCount(), 1);
      const logMessage = consoleSpy.mock.calls[0].arguments[0];
      assert.ok(logMessage.includes('Error in /api/tasks/run'));

      consoleSpy.mock.restore();
    });

    it('should log error with default prefix when context not provided', () => {
      const consoleSpy = mock.method(console, 'error', () => {});
      const error = new Error('Test error');

      handleControllerError(error, mockRes);

      assert.strictEqual(consoleSpy.mock.callCount(), 1);
      const logMessage = consoleSpy.mock.calls[0].arguments[0];
      assert.ok(logMessage.includes('Controller error:'));

      consoleSpy.mock.restore();
    });

    it('should log the error object', () => {
      const consoleSpy = mock.method(console, 'error', () => {});
      const error = new Error('Test error');

      handleControllerError(error, mockRes);

      const loggedError = consoleSpy.mock.calls[0].arguments[1];
      assert.strictEqual(loggedError, error);

      consoleSpy.mock.restore();
    });

    it('should format response as JSON with error key', () => {
      const error = new Error('Database connection failed');

      handleControllerError(error, mockRes);

      const jsonResponse = mockJson.mock.calls[0].arguments[0];
      assert.ok(typeof jsonResponse === 'object');
      assert.ok('error' in jsonResponse);
      assert.strictEqual(typeof jsonResponse.error, 'string');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instances', () => {
      const error = new Error('Custom error message');
      assert.strictEqual(getErrorMessage(error), 'Custom error message');
    });

    it('should return "Unknown error" for non-Error values', () => {
      assert.strictEqual(getErrorMessage('string error'), 'Unknown error');
      assert.strictEqual(getErrorMessage(null), 'Unknown error');
      assert.strictEqual(getErrorMessage(undefined), 'Unknown error');
      assert.strictEqual(getErrorMessage(42), 'Unknown error');
      assert.strictEqual(getErrorMessage({ message: 'test' }), 'Unknown error');
    });

    it('should handle TypeError correctly', () => {
      const error = new TypeError('Type error occurred');
      assert.strictEqual(getErrorMessage(error), 'Type error occurred');
    });

    it('should handle RangeError correctly', () => {
      const error = new RangeError('Range error occurred');
      assert.strictEqual(getErrorMessage(error), 'Range error occurred');
    });

    it('should handle SyntaxError correctly', () => {
      const error = new SyntaxError('Syntax error occurred');
      assert.strictEqual(getErrorMessage(error), 'Syntax error occurred');
    });

    it('should handle custom error classes', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      assert.strictEqual(getErrorMessage(error), 'Custom error message');
    });

    it('should handle errors with empty message', () => {
      const error = new Error('');
      assert.strictEqual(getErrorMessage(error), '');
    });
  });
});
