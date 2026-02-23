/**
 * Unit tests for taskParser utilities.
 *
 * Tests task status parsing from stdout markers.
 *
 * @module test/unit/utils/taskParser.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseTaskStatus,
  parseTaskStatuses,
  containsTaskStatus,
  extractStatus,
  createStatusMarker,
  TASK_STATUS_PREFIX,
} from '../../../src/server/utils/taskParser';

describe('taskParser', () => {
  describe('TASK_STATUS_PREFIX constant', () => {
    it('should have the correct prefix value', () => {
      assert.strictEqual(TASK_STATUS_PREFIX, '[TASK_STATUS:');
    });
  });

  describe('parseTaskStatus', () => {
    it('should parse STARTED status without data', () => {
      const line = '[TASK_STATUS:STARTED]';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'STARTED');
      assert.deepStrictEqual(result.data, {});
    });

    it('should parse COMPLETED status without data', () => {
      const line = '[TASK_STATUS:COMPLETED]';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'COMPLETED');
      assert.deepStrictEqual(result.data, {});
    });

    it('should parse FAILED status with error data', () => {
      const line = '[TASK_STATUS:FAILED]{"errorMessage":"Something went wrong"}';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'FAILED');
      assert.strictEqual(result.data.errorMessage, 'Something went wrong');
    });

    it('should parse COMPLETED_WITH_DATA status with data', () => {
      const line = '[TASK_STATUS:COMPLETED_WITH_DATA]{"taskName":"my-task","data":{"count":5}}';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'COMPLETED_WITH_DATA');
      assert.strictEqual(result.data.taskName, 'my-task');
      assert.deepStrictEqual(result.data.data, { count: 5 });
    });

    it('should parse status when embedded in other text (status only)', () => {
      // When embedded with trailing text, JSON parsing fails so data is empty
      const line = 'Some log output [TASK_STATUS:STARTED] more output';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'STARTED');
      assert.deepStrictEqual(result.data, {});
    });

    it('should parse status at start of line with data', () => {
      // When marker is at start, everything after ] is parsed as JSON
      const line = '[TASK_STATUS:STARTED]{"taskName":"test"}';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'STARTED');
      assert.strictEqual(result.data.taskName, 'test');
    });

    it('should return null for invalid status value', () => {
      const line = '[TASK_STATUS:INVALID_STATUS]';
      const result = parseTaskStatus(line);

      assert.strictEqual(result, null);
    });

    it('should return null when prefix is missing', () => {
      const line = 'No status marker here';
      const result = parseTaskStatus(line);

      assert.strictEqual(result, null);
    });

    it('should return null when closing bracket is missing', () => {
      const line = '[TASK_STATUS:STARTED';
      const result = parseTaskStatus(line);

      assert.strictEqual(result, null);
    });

    it('should return empty data object for malformed JSON', () => {
      const line = '[TASK_STATUS:STARTED]{invalid json}';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'STARTED');
      assert.deepStrictEqual(result.data, {});
    });

    it('should handle empty string', () => {
      const result = parseTaskStatus('');

      assert.strictEqual(result, null);
    });

    it('should parse complex nested JSON data', () => {
      const line = '[TASK_STATUS:COMPLETED_WITH_DATA]{"metadata":{"category":"test","ttl":3600},"data":{"items":[1,2,3]}}';
      const result = parseTaskStatus(line);

      assert.ok(result);
      assert.strictEqual(result.status, 'COMPLETED_WITH_DATA');
      assert.deepStrictEqual(result.data.metadata, { category: 'test', ttl: 3600 });
      assert.deepStrictEqual(result.data.data, { items: [1, 2, 3] });
    });
  });

  describe('parseTaskStatuses', () => {
    it('should parse multiple status lines', () => {
      const lines = [
        '[TASK_STATUS:STARTED]{"taskName":"test"}',
        'Some other output',
        '[TASK_STATUS:COMPLETED]',
      ];
      const results = parseTaskStatuses(lines);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].status, 'STARTED');
      assert.strictEqual(results[1].status, 'COMPLETED');
    });

    it('should return empty array for no status markers', () => {
      const lines = ['Regular output', 'No markers here', 'Just logs'];
      const results = parseTaskStatuses(lines);

      assert.deepStrictEqual(results, []);
    });

    it('should skip empty lines', () => {
      const lines = ['', '[TASK_STATUS:STARTED]', '   ', '[TASK_STATUS:COMPLETED]', ''];
      const results = parseTaskStatuses(lines);

      assert.strictEqual(results.length, 2);
    });

    it('should handle empty array', () => {
      const results = parseTaskStatuses([]);

      assert.deepStrictEqual(results, []);
    });

    it('should trim whitespace from lines', () => {
      const lines = ['   [TASK_STATUS:STARTED]   '];
      const results = parseTaskStatuses(lines);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].status, 'STARTED');
    });
  });

  describe('containsTaskStatus', () => {
    it('should return true for line with status marker', () => {
      assert.strictEqual(containsTaskStatus('[TASK_STATUS:STARTED]'), true);
    });

    it('should return true for line with embedded status marker', () => {
      assert.strictEqual(containsTaskStatus('Log: [TASK_STATUS:COMPLETED] done'), true);
    });

    it('should return false for line without status marker', () => {
      assert.strictEqual(containsTaskStatus('No marker here'), false);
    });

    it('should return false for empty string', () => {
      assert.strictEqual(containsTaskStatus(''), false);
    });

    it('should return false for partial marker', () => {
      assert.strictEqual(containsTaskStatus('[TASK_STATUS'), false);
    });
  });

  describe('extractStatus', () => {
    it('should extract STARTED status', () => {
      assert.strictEqual(extractStatus('[TASK_STATUS:STARTED]'), 'STARTED');
    });

    it('should extract FAILED status with data', () => {
      assert.strictEqual(extractStatus('[TASK_STATUS:FAILED]{"errorMessage":"x"}'), 'FAILED');
    });

    it('should extract status from embedded text', () => {
      assert.strictEqual(extractStatus('Log: [TASK_STATUS:COMPLETED] done'), 'COMPLETED');
    });

    it('should return null for invalid status', () => {
      assert.strictEqual(extractStatus('[TASK_STATUS:INVALID]'), null);
    });

    it('should return null when no marker present', () => {
      assert.strictEqual(extractStatus('No marker'), null);
    });

    it('should return null when closing bracket missing', () => {
      assert.strictEqual(extractStatus('[TASK_STATUS:STARTED'), null);
    });

    it('should return null for empty string', () => {
      assert.strictEqual(extractStatus(''), null);
    });
  });

  describe('createStatusMarker', () => {
    it('should create STARTED marker without data', () => {
      const marker = createStatusMarker('STARTED');

      assert.strictEqual(marker, '[TASK_STATUS:STARTED]');
    });

    it('should create COMPLETED marker with data', () => {
      const marker = createStatusMarker('COMPLETED', { taskName: 'test' });

      assert.strictEqual(marker, '[TASK_STATUS:COMPLETED]{"taskName":"test"}');
    });

    it('should create FAILED marker with error data', () => {
      const marker = createStatusMarker('FAILED', { errorMessage: 'Something failed' });

      assert.strictEqual(marker, '[TASK_STATUS:FAILED]{"errorMessage":"Something failed"}');
    });

    it('should create COMPLETED_WITH_DATA marker', () => {
      const marker = createStatusMarker('COMPLETED_WITH_DATA', {
        data: { result: 'success' },
        metadata: { ttl: 3600 },
      });

      assert.ok(marker.includes('[TASK_STATUS:COMPLETED_WITH_DATA]'));
      assert.ok(marker.includes('"result":"success"'));
      assert.ok(marker.includes('"ttl":3600'));
    });

    it('should not include JSON for empty data object', () => {
      const marker = createStatusMarker('STARTED', {});

      assert.strictEqual(marker, '[TASK_STATUS:STARTED]');
    });

    it('should not include JSON for undefined data', () => {
      const marker = createStatusMarker('COMPLETED');

      assert.strictEqual(marker, '[TASK_STATUS:COMPLETED]');
    });
  });

  describe('roundtrip: createStatusMarker -> parseTaskStatus', () => {
    it('should roundtrip STARTED status', () => {
      const marker = createStatusMarker('STARTED', { taskName: 'my-task' });
      const parsed = parseTaskStatus(marker);

      assert.ok(parsed);
      assert.strictEqual(parsed.status, 'STARTED');
      assert.strictEqual(parsed.data.taskName, 'my-task');
    });

    it('should roundtrip FAILED status', () => {
      const marker = createStatusMarker('FAILED', { errorMessage: 'Test error', errorContext: { code: 500 } });
      const parsed = parseTaskStatus(marker);

      assert.ok(parsed);
      assert.strictEqual(parsed.status, 'FAILED');
      assert.strictEqual(parsed.data.errorMessage, 'Test error');
      assert.deepStrictEqual(parsed.data.errorContext, { code: 500 });
    });

    it('should roundtrip COMPLETED_WITH_DATA status with nested data', () => {
      const complexData = {
        metadata: { category: 'test', ttl: 3600 },
        data: { results: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }] },
      };
      const marker = createStatusMarker('COMPLETED_WITH_DATA', complexData);
      const parsed = parseTaskStatus(marker);

      assert.ok(parsed);
      assert.strictEqual(parsed.status, 'COMPLETED_WITH_DATA');
      assert.deepStrictEqual(parsed.data, complexData);
    });
  });
});
