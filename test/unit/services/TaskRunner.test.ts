/**
 * Unit tests for TaskRunner.
 *
 * Tests child process spawning, event handling, and termination.
 *
 * @module test/unit/services/TaskRunner.test
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'events';
import { TaskRunner } from '../../../src/server/services/TaskRunner';
import type { ChildProcess } from 'child_process';

// Mock child_process
const mockSpawn = mock.fn<() => ChildProcess>();

describe('TaskRunner', () => {
  let runner: TaskRunner;
  const testCwd = '/test/project';

  beforeEach(() => {
    mockSpawn.mock.resetCalls();
    runner = new TaskRunner(testCwd);
  });

  describe('run', () => {
    it('should spawn process with correct npm command', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);

      runner.run('test-task');

      assert.strictEqual(mockSpawn.mock.callCount(), 1);
      const [command, args, options] = mockSpawn.mock.calls[0].arguments;
      assert.strictEqual(command, 'npm');
      assert.ok(args.includes('run'));
      assert.ok(args.includes('bot'));
      assert.ok(args.some((arg: string) => arg.includes('--task=test-task')));
      assert.strictEqual(options.cwd, testCwd);
    });

    it('should use custom working directory', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);
      const customCwd = '/custom/dir';

      runner.run('test-task', { cwd: customCwd });

      const [, , options] = mockSpawn.mock.calls[0].arguments;
      assert.strictEqual(options.cwd, customCwd);
    });

    it('should return spawned child process', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);

      const result = runner.run('test-task');

      assert.strictEqual(result, mockChild);
    });

    it('should set up event handlers when onEvent provided', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);
      const onEvent = mock.fn();

      runner.run('test-task', { onEvent });

      // Verify stdout handler was set up
      assert.strictEqual(mockChild.stdout.on.mock.callCount(), 1);
    });
  });

  describe('record', () => {
    it('should spawn record process with task name and type', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);

      runner.record('new-task', 'private');

      const [command, args] = mockSpawn.mock.calls[0].arguments;
      assert.strictEqual(command, 'npm');
      assert.ok(args.includes('run'));
      assert.ok(args.includes('record'));
      assert.ok(args.some((arg: string) => arg.includes('--name=new-task')));
      assert.ok(args.some((arg: string) => arg.includes('--type=private')));
    });

    it('should spawn record process without args when no name provided', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);

      runner.record(undefined, undefined);

      const [, args] = mockSpawn.mock.calls[0].arguments;
      assert.ok(args.includes('run'));
      assert.ok(args.includes('record'));
    });
  });

  describe('setupLogin', () => {
    it('should spawn setup-login process', () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mock.mockImplementation(() => mockChild);

      runner.setupLogin();

      const [command, args] = mockSpawn.mock.calls[0].arguments;
      assert.strictEqual(command, 'npm');
      assert.ok(args.includes('run'));
      assert.ok(args.includes('setup-login'));
    });
  });

  describe('isRunning', () => {
    it('should return true for running process', () => {
      const mockChild = createMockChildProcess();
      mockChild.exitCode = null;
      mockChild.killed = false;

      const result = runner.isRunning(mockChild);

      assert.strictEqual(result, true);
    });

    it('should return false for exited process', () => {
      const mockChild = createMockChildProcess();
      mockChild.exitCode = 0;
      mockChild.killed = false;

      const result = runner.isRunning(mockChild);

      assert.strictEqual(result, false);
    });

    it('should return false for killed process', () => {
      const mockChild = createMockChildProcess();
      mockChild.exitCode = null;
      mockChild.killed = true;

      const result = runner.isRunning(mockChild);

      assert.strictEqual(result, false);
    });
  });
});

/**
 * Creates a mock child process with event emitters.
 */
function createMockChildProcess(): ChildProcess {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  (stdout as unknown as Record<string, unknown>).on = mock.fn();
  (stderr as unknown as Record<string, unknown>).on = mock.fn();

  const child = new EventEmitter() as unknown as ChildProcess;
  Object.assign(child, {
    stdout,
    stderr,
    stdin: new EventEmitter(),
    pid: 12345,
    exitCode: null,
    killed: false,
    kill: mock.fn(() => true),
  });

  return child;
}
