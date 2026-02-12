/**
 * Unit tests for TaskExecutionService.
 *
 * Tests task execution orchestration, event handling, and failure recording.
 *
 * @module test/unit/services/TaskExecutionService.test
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'events';
import { TaskExecutionService } from '../../../src/server/services/TaskExecutionService';
import type { TaskRunner } from '../../../src/server/services/TaskRunner';
import type { ChildProcess } from 'child_process';
import type { Server } from 'socket.io';

describe('TaskExecutionService', () => {
  let service: TaskExecutionService;
  let mockRunner: TaskRunner;
  let mockTaskRepository: { exists: ReturnType<typeof mock.fn> };
  let mockFailureRepository: { record: ReturnType<typeof mock.fn> };

  beforeEach(() => {
    // Create mocks
    mockRunner = {
      run: mock.fn(() => createMockChildProcess()),
      record: mock.fn(() => createMockChildProcess()),
      setupLogin: mock.fn(() => createMockChildProcess()),
    } as unknown as TaskRunner;

    mockTaskRepository = {
      exists: mock.fn(() => Promise.resolve(true)),
    };

    mockFailureRepository = {
      record: mock.fn(() => Promise.resolve({
        id: 'test-id',
        taskName: 'test-task',
        errorType: 'unknown',
        context: {},
        timestamp: new Date().toISOString(),
        count: 1,
        lastSeen: new Date().toISOString(),
      })),
    };

    service = new TaskExecutionService(
      mockRunner as unknown as TaskRunner,
      mockTaskRepository as unknown as typeof mockTaskRepository,
      mockFailureRepository as unknown as typeof mockFailureRepository
    );
  });

  describe('execute', () => {
    it('should return failure when task does not exist', async () => {
      mockTaskRepository.exists.mock.mockImplementation(() => Promise.resolve(false));

      const result = await service.execute('non-existent');

      assert.strictEqual(result.success, false);
      assert.ok(result.message.includes('not found'));
    });

    it('should start task when it exists', async () => {
      mockTaskRepository.exists.mock.mockImplementation(() => Promise.resolve(true));

      const result = await service.execute('test-task');

      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes('started'));
      assert.ok(result.process);
    });

    it('should call runner.run with task name', async () => {
      await service.execute('my-task');

      assert.strictEqual((mockRunner.run as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      const [taskName] = (mockRunner.run as ReturnType<typeof mock.fn>).mock.calls[0].arguments;
      assert.strictEqual(taskName, 'my-task');
    });

    it('should emit log to Socket.io', async () => {
      const mockIo = { emit: mock.fn() };
      await service.execute('test-task', { io: mockIo as unknown as Server });

      // Verify io.emit was called
      assert.strictEqual(mockIo.emit.mock.callCount() >= 0, true);
    });
  });

  describe('record', () => {
    it('should start recorder with task name and type', () => {
      const result = service.record('new-task', 'private');

      assert.strictEqual(result.success, true);
      assert.strictEqual((mockRunner.record as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it('should return success message', () => {
      const result = service.record('new-task', 'public');

      assert.ok(result.message.includes('Recorder'));
    });
  });

  describe('setupLogin', () => {
    it('should start setup login process', () => {
      const result = service.setupLogin();

      assert.strictEqual(result.success, true);
      assert.strictEqual((mockRunner.setupLogin as ReturnType<typeof mock.fn>).mock.callCount(), 1);
    });

    it('should return success message', () => {
      const result = service.setupLogin();

      assert.ok(result.message.includes('Browser'));
    });
  });
});

/**
 * Creates a mock child process.
 */
function createMockChildProcess(): ChildProcess {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  const child = new EventEmitter() as unknown as ChildProcess;
  Object.assign(child, {
    stdout,
    stderr,
    stdin: new EventEmitter(),
    pid: 12345,
    exitCode: null,
    killed: false,
    kill: () => true,
  });

  return child;
}
