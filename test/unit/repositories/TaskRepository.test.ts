/**
 * Unit tests for TaskRepository.
 *
 * Tests task discovery, file reading, and existence checking.
 *
 * @module test/unit/repositories/TaskRepository.test
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { TaskRepository } from '../../../src/server/repositories/TaskRepository';
import * as fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
const mockReaddir = mock.fn<() => Promise<string[]>>();
const mockReadFile = mock.fn<() => Promise<string>>();

// Replace fs functions with mocks
const originalReaddir = fs.readdir;
const originalReadFile = fs.readFile;

describe('TaskRepository', () => {
  let repository: TaskRepository;
  const testTasksDir = '/test/tasks';

  beforeEach(() => {
    // Reset mocks
    mockReaddir.mock.resetCalls();
    mockReadFile.mock.resetCalls();

    // Create repository with test directory
    repository = new TaskRepository(testTasksDir);

    // Replace fs functions
    (fs as unknown as Record<string, unknown>).readdir = mockReaddir;
    (fs as unknown as Record<string, unknown>).readFile = mockReadFile;
  });

  afterEach(() => {
    // Restore original functions
    (fs as unknown as Record<string, unknown>).readdir = originalReaddir;
    (fs as unknown as Record<string, unknown>).readFile = originalReadFile;
  });

  describe('findAll', () => {
    it('should return empty array when no tasks exist', async () => {
      mockReaddir.mock.mockImplementation(() => Promise.resolve([]));

      const tasks = await repository.findAll();

      assert.deepStrictEqual(tasks, []);
    });

    it('should discover tasks from public directory', async () => {
      // Mock public directory with tasks
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['task1.js', 'task2.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const tasks = await repository.findAll();

      assert.strictEqual(tasks.length, 2);
      assert.ok(tasks.some(t => t.name === 'task1' && t.type === 'public'));
      assert.ok(tasks.some(t => t.name === 'task2' && t.type === 'public'));
    });

    it('should discover tasks from private directory', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('private')) {
          return Promise.resolve(['private-task.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const tasks = await repository.findAll();

      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].name, 'private-task');
      assert.strictEqual(tasks[0].type, 'private');
    });

    it('should prioritize public over private tasks with same name', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['shared-task.js'] as unknown as fs.Dirent[]);
        }
        if (dirPath.includes('private')) {
          return Promise.resolve(['shared-task.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const tasks = await repository.findAll();

      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].type, 'public');
    });

    it('should ignore non-js files', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['task.js', 'readme.txt', 'data.json'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const tasks = await repository.findAll();

      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].name, 'task');
    });
  });

  describe('findByName', () => {
    it('should return undefined for non-existent task', async () => {
      mockReaddir.mock.mockImplementation(() => Promise.resolve([]));

      const task = await repository.findByName('non-existent');

      assert.strictEqual(task, undefined);
    });

    it('should find task by name', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['my-task.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const task = await repository.findByName('my-task');

      assert.ok(task);
      assert.strictEqual(task.name, 'my-task');
    });
  });

  describe('exists', () => {
    it('should return false for non-existent task', async () => {
      mockReaddir.mock.mockImplementation(() => Promise.resolve([]));

      const exists = await repository.exists('non-existent');

      assert.strictEqual(exists, false);
    });

    it('should return true for existing task', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['existing-task.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });

      const exists = await repository.exists('existing-task');

      assert.strictEqual(exists, true);
    });
  });

  describe('readTask', () => {
    it('should return undefined for non-existent task', async () => {
      mockReaddir.mock.mockImplementation(() => Promise.resolve([]));

      const task = await repository.readTask('non-existent');

      assert.strictEqual(task, undefined);
    });

    it('should return task with content', async () => {
      mockReaddir.mock.mockImplementation((dirPath: string) => {
        if (dirPath.includes('public')) {
          return Promise.resolve(['task-with-content.js'] as unknown as fs.Dirent[]);
        }
        return Promise.resolve([] as unknown as fs.Dirent[]);
      });
      mockReadFile.mock.mockImplementation(() => Promise.resolve('export async function run() {}'));

      const task = await repository.readTask('task-with-content');

      assert.ok(task);
      assert.strictEqual(task.name, 'task-with-content');
      assert.strictEqual(task.content, 'export async function run() {}');
    });
  });
});
