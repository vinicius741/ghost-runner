/**
 * Unit tests for FailureRepository.
 *
 * Tests failure recording, deduplication, and management.
 *
 * @module test/unit/repositories/FailureRepository.test
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { FailureRepository } from '../../../src/server/repositories/FailureRepository';
import * as fs from 'fs/promises';

// Mock fs/promises
const mockReadFile = mock.fn<() => Promise<string>>();
const mockWriteFile = mock.fn<() => Promise<void>>();

// Replace fs functions with mocks
const originalReadFile = fs.readFile;
const originalWriteFile = fs.writeFile;

describe('FailureRepository', () => {
  let repository: FailureRepository;
  const testFilePath = '/test/failures.json';

  beforeEach(() => {
    // Reset mocks
    mockReadFile.mock.resetCalls();
    mockWriteFile.mock.resetCalls();

    // Create repository with test file path
    repository = new FailureRepository(testFilePath);

    // Replace fs functions
    (fs as unknown as Record<string, unknown>).readFile = mockReadFile;
    (fs as unknown as Record<string, unknown>).writeFile = mockWriteFile;
  });

  afterEach(() => {
    // Restore original functions
    (fs as unknown as Record<string, unknown>).readFile = originalReadFile;
    (fs as unknown as Record<string, unknown>).writeFile = originalWriteFile;
  });

  describe('getAll', () => {
    it('should return empty array when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mock.mockImplementation(() => Promise.reject(error));

      const failures = await repository.getAll();

      assert.deepStrictEqual(failures, []);
    });

    it('should return parsed failures from file', async () => {
      const mockFailures = [
        { id: 'test-1', taskName: 'task1', errorType: 'unknown', context: {}, timestamp: '2024-01-01T00:00:00Z', count: 1, lastSeen: '2024-01-01T00:00:00Z' },
      ];
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify(mockFailures)));

      const failures = await repository.getAll();

      assert.strictEqual(failures.length, 1);
      assert.strictEqual(failures[0].taskName, 'task1');
    });
  });

  describe('createRecord', () => {
    it('should create a failure record with all fields', () => {
      const record = repository.createRecord(
        'test-task',
        'element_not_found',
        'Element not found: #button',
        { selector: '#button' }
      );

      assert.strictEqual(record.taskName, 'test-task');
      assert.strictEqual(record.errorType, 'element_not_found');
      assert.strictEqual(record.count, 1);
      assert.strictEqual(record.dismissed, false);
      assert.ok(record.id.includes('test-task'));
      assert.ok(record.context.errorMessage);
    });

    it('should default invalid error type to unknown', () => {
      const record = repository.createRecord(
        'test-task',
        'invalid_type',
        'Some error',
        {}
      );

      assert.strictEqual(record.errorType, 'unknown');
    });

    it('should include error message in context', () => {
      const record = repository.createRecord(
        'test-task',
        'timeout',
        'Timeout waiting for element',
        { timeout: 5000 }
      );

      assert.strictEqual(record.context.errorMessage, 'Timeout waiting for element');
      assert.strictEqual(record.context.timeout, 5000);
    });
  });

  describe('record', () => {
    it('should create new failure when none exists', async () => {
      mockReadFile.mock.mockImplementation(() => Promise.resolve('[]'));

      const failure = await repository.record(
        'test-task',
        'element_not_found',
        'Element not found',
        { selector: '#test' }
      );

      assert.strictEqual(failure.taskName, 'test-task');
      assert.strictEqual(failure.count, 1);
    });

    it('should increment count for duplicate failure within 24 hours', async () => {
      const existingFailure = {
        id: 'test-task-element_not_found-123',
        taskName: 'test-task',
        errorType: 'element_not_found',
        context: { errorMessage: 'Element not found' },
        timestamp: new Date().toISOString(),
        count: 1,
        lastSeen: new Date().toISOString(),
        dismissed: false,
      };
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify([existingFailure])));

      const failure = await repository.record(
        'test-task',
        'element_not_found',
        'Element not found',
        { selector: '#test' }
      );

      assert.strictEqual(failure.count, 2);
      assert.strictEqual(failure.id, existingFailure.id);
    });

    it('should create new failure for dismissed failure', async () => {
      const dismissedFailure = {
        id: 'test-task-element_not_found-123',
        taskName: 'test-task',
        errorType: 'element_not_found',
        context: { errorMessage: 'Element not found' },
        timestamp: new Date().toISOString(),
        count: 1,
        lastSeen: new Date().toISOString(),
        dismissed: true,
      };
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify([dismissedFailure])));

      const failure = await repository.record(
        'test-task',
        'element_not_found',
        'Element not found',
        { selector: '#test' }
      );

      assert.strictEqual(failure.count, 1);
      assert.notStrictEqual(failure.id, dismissedFailure.id);
    });
  });

  describe('dismiss', () => {
    it('should dismiss existing failure', async () => {
      const existingFailure = {
        id: 'test-123',
        taskName: 'test-task',
        errorType: 'unknown',
        context: {},
        timestamp: '2024-01-01T00:00:00Z',
        count: 1,
        lastSeen: '2024-01-01T00:00:00Z',
        dismissed: false,
      };
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify([existingFailure])));

      const result = await repository.dismiss('test-123');

      assert.strictEqual(result, true);
    });

    it('should return false for non-existent failure', async () => {
      mockReadFile.mock.mockImplementation(() => Promise.resolve('[]'));

      const result = await repository.dismiss('non-existent');

      assert.strictEqual(result, false);
    });
  });

  describe('getActive', () => {
    it('should return only non-dismissed failures', async () => {
      const failures = [
        { id: '1', taskName: 'task1', errorType: 'unknown', context: {}, timestamp: '', count: 1, lastSeen: '', dismissed: false },
        { id: '2', taskName: 'task2', errorType: 'unknown', context: {}, timestamp: '', count: 1, lastSeen: '', dismissed: true },
      ];
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify(failures)));

      const active = await repository.getActive();

      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].id, '1');
    });

    it('should return all failures when all are dismissed', async () => {
      const failures = [
        { id: '1', taskName: 'task1', errorType: 'unknown', context: {}, timestamp: '', count: 1, lastSeen: '', dismissed: true },
      ];
      mockReadFile.mock.mockImplementation(() => Promise.resolve(JSON.stringify(failures)));

      const active = await repository.getActive();

      assert.strictEqual(active.length, 1);
    });
  });

  describe('clear', () => {
    it('should clear all failures', async () => {
      await repository.clear();

      // Verify writeFile was called with empty array
      assert.strictEqual(mockWriteFile.mock.callCount(), 1);
    });
  });
});
