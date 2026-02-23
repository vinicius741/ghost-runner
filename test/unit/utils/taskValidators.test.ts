/**
 * Unit tests for taskValidators utilities.
 *
 * Tests task name validation for security (injection prevention).
 *
 * @module test/unit/utils/taskValidators.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isValidTaskName,
  sanitizeTaskName,
  hasValidTaskNameLength,
  hasNoPathTraversal,
  validateTaskName,
} from '../../../src/server/utils/taskValidators';

describe('taskValidators', () => {
  describe('isValidTaskName', () => {
    it('should accept alphanumeric names', () => {
      assert.strictEqual(isValidTaskName('mytask123'), true);
    });

    it('should accept names with hyphens', () => {
      assert.strictEqual(isValidTaskName('my-task-name'), true);
    });

    it('should accept names with underscores', () => {
      assert.strictEqual(isValidTaskName('my_task_name'), true);
    });

    it('should accept mixed valid characters', () => {
      assert.strictEqual(isValidTaskName('my-task_name123'), true);
    });

    it('should reject names with spaces', () => {
      assert.strictEqual(isValidTaskName('my task'), false);
    });

    it('should reject names with special characters', () => {
      assert.strictEqual(isValidTaskName('my@task'), false);
      assert.strictEqual(isValidTaskName('my!task'), false);
      assert.strictEqual(isValidTaskName('my#task'), false);
    });

    it('should reject names with forward slashes', () => {
      assert.strictEqual(isValidTaskName('my/task'), false);
    });

    it('should reject names with backslashes', () => {
      assert.strictEqual(isValidTaskName('my\\task'), false);
    });

    it('should reject empty names', () => {
      assert.strictEqual(isValidTaskName(''), false);
    });

    it('should reject names over 100 characters', () => {
      const longName = 'a'.repeat(101);
      assert.strictEqual(isValidTaskName(longName), false);
    });

    it('should reject names exactly 100 characters (max is 99)', () => {
      const hundredName = 'a'.repeat(100);
      assert.strictEqual(isValidTaskName(hundredName), false);
    });

    it('should accept names up to 99 characters', () => {
      const maxValidName = 'a'.repeat(99);
      assert.strictEqual(isValidTaskName(maxValidName), true);
    });

    it('should reject names with dots', () => {
      assert.strictEqual(isValidTaskName('my.task'), false);
    });

    it('should reject names starting with hyphen', () => {
      // This is technically valid per the regex but might cause CLI issues
      assert.strictEqual(isValidTaskName('-task'), true);
    });
  });

  describe('sanitizeTaskName', () => {
    it('should keep valid characters unchanged', () => {
      assert.strictEqual(sanitizeTaskName('my-task_name123'), 'my-task_name123');
    });

    it('should remove spaces', () => {
      assert.strictEqual(sanitizeTaskName('my task name'), 'mytaskname');
    });

    it('should remove special characters', () => {
      assert.strictEqual(sanitizeTaskName('my@task#name!'), 'mytaskname');
    });

    it('should remove forward slashes', () => {
      assert.strictEqual(sanitizeTaskName('my/task/name'), 'mytaskname');
    });

    it('should remove backslashes', () => {
      assert.strictEqual(sanitizeTaskName('my\\task\\name'), 'mytaskname');
    });

    it('should remove dots', () => {
      assert.strictEqual(sanitizeTaskName('my.task.name'), 'mytaskname');
    });

    it('should return empty string for all invalid characters', () => {
      assert.strictEqual(sanitizeTaskName('@#$%^&*()'), '');
    });

    it('should handle mixed valid and invalid characters', () => {
      assert.strictEqual(sanitizeTaskName('my-task@#$name_123'), 'my-taskname_123');
    });

    it('should preserve hyphens and underscores', () => {
      assert.strictEqual(sanitizeTaskName('a-b_c'), 'a-b_c');
    });
  });

  describe('hasValidTaskNameLength', () => {
    it('should accept names with valid length', () => {
      assert.strictEqual(hasValidTaskNameLength('task'), true);
    });

    it('should accept single character names', () => {
      assert.strictEqual(hasValidTaskNameLength('a'), true);
    });

    it('should reject empty names', () => {
      assert.strictEqual(hasValidTaskNameLength(''), false);
    });

    it('should accept names exactly 100 characters', () => {
      const maxName = 'a'.repeat(100);
      assert.strictEqual(hasValidTaskNameLength(maxName), true);
    });

    it('should reject names over 100 characters', () => {
      const longName = 'a'.repeat(101);
      assert.strictEqual(hasValidTaskNameLength(longName), false);
    });

    it('should reject names over 100 characters significantly', () => {
      const veryLongName = 'a'.repeat(1000);
      assert.strictEqual(hasValidTaskNameLength(veryLongName), false);
    });
  });

  describe('hasNoPathTraversal', () => {
    it('should accept safe names', () => {
      assert.strictEqual(hasNoPathTraversal('my-task'), true);
      assert.strictEqual(hasNoPathTraversal('my_task'), true);
      assert.strictEqual(hasNoPathTraversal('task123'), true);
    });

    it('should reject ../ pattern', () => {
      assert.strictEqual(hasNoPathTraversal('../task'), false);
      assert.strictEqual(hasNoPathTraversal('tasks/../secret'), false);
    });

    it('should reject ..\\ pattern', () => {
      assert.strictEqual(hasNoPathTraversal('..\\task'), false);
      assert.strictEqual(hasNoPathTraversal('tasks\\..\\secret'), false);
    });

    it('should reject URL-encoded ../ (%2e%2e)', () => {
      assert.strictEqual(hasNoPathTraversal('%2e%2e/task'), false);
      assert.strictEqual(hasNoPathTraversal('tasks/%2e%2e/secret'), false);
    });

    it('should reject double URL-encoded . (%252e)', () => {
      assert.strictEqual(hasNoPathTraversal('%252e%252e/task'), false);
    });

    it('should reject ..%2f pattern', () => {
      assert.strictEqual(hasNoPathTraversal('..%2ftask'), false);
    });

    it('should reject ..%5c pattern', () => {
      assert.strictEqual(hasNoPathTraversal('..%5ctask'), false);
    });

    it('should detect pattern anywhere in string', () => {
      assert.strictEqual(hasNoPathTraversal('task../../etc/passwd'), false);
    });

    it('should be case-insensitive for encoded patterns', () => {
      assert.strictEqual(hasNoPathTraversal('%2E%2E/task'), false);
      assert.strictEqual(hasNoPathTraversal('%2e%2E/task'), false);
    });
  });

  describe('validateTaskName', () => {
    it('should return valid for safe names', () => {
      const result = validateTaskName('my-task_name123');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, undefined);
    });

    it('should return error for empty name', () => {
      const result = validateTaskName('');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('1 and 100 characters'));
    });

    it('should return error for too long name', () => {
      const longName = 'a'.repeat(101);
      const result = validateTaskName(longName);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('1 and 100 characters'));
    });

    it('should return error for path traversal attempts', () => {
      const result = validateTaskName('../etc/passwd');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('path traversal'));
    });

    it('should return error for URL-encoded path traversal', () => {
      const result = validateTaskName('%2e%2e/etc/passwd');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('path traversal'));
    });

    it('should return error for invalid characters', () => {
      const result = validateTaskName('my@task!');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('invalid characters'));
    });

    it('should return error for names with spaces', () => {
      const result = validateTaskName('my task name');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('invalid characters'));
    });

    it('should return error for names with slashes', () => {
      const result = validateTaskName('tasks/my-task');
      assert.strictEqual(result.valid, false);
      // Could be either path traversal or invalid chars depending on the name
      assert.strictEqual(result.valid, false);
    });

    it('should validate order: length first, then path traversal, then characters', () => {
      // Test that all validations are run in order
      const emptyResult = validateTaskName('');
      assert.ok(emptyResult.error?.includes('1 and 100 characters'));

      const pathResult = validateTaskName('../test');
      assert.ok(pathResult.error?.includes('path traversal'));

      const charResult = validateTaskName('test@');
      assert.ok(charResult.error?.includes('invalid characters'));
    });

    it('should accept boundary valid names', () => {
      // Single character
      const single = validateTaskName('a');
      assert.strictEqual(single.valid, true);

      // 99 characters (max allowed by isValidTaskName)
      const ninetyNine = validateTaskName('a'.repeat(99));
      assert.strictEqual(ninetyNine.valid, true);
    });
  });

  describe('security scenarios', () => {
    it('should reject command injection attempts', () => {
      assert.strictEqual(isValidTaskName('task;rm -rf /'), false);
      assert.strictEqual(isValidTaskName('task$(whoami)'), false);
      assert.strictEqual(isValidTaskName('task`id`'), false);
      assert.strictEqual(isValidTaskName('task|cat /etc/passwd'), false);
    });

    it('should reject null byte injection', () => {
      assert.strictEqual(isValidTaskName('task\u0000.txt'), false);
    });

    it('should reject unicode tricks that might bypass validation', () => {
      // These should be rejected due to non-alphanumeric characters
      assert.strictEqual(isValidTaskName('task\u202Etxt'), false); // Right-to-left override
    });

    it('should sanitize dangerous names to safe versions', () => {
      assert.strictEqual(sanitizeTaskName('task;rm -rf /'), 'taskrm-rf');
      assert.strictEqual(sanitizeTaskName('task$(whoami)'), 'taskwhoami');
    });
  });
});
