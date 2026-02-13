/**
 * TaskRepository - Data access layer for task files.
 *
 * This repository abstracts all file system operations related to task discovery
 * and management. Tasks are stored as JavaScript modules in the tasks/ directory.
 *
 * @module server/repositories/TaskRepository
 */

import * as fs from 'fs/promises';
import path from 'path';
import { TASKS_DIR, BUNDLED_TASKS_DIR, getTaskRoots } from '../config';

/**
 * Task type classification based on directory location.
 */
export type TaskType = 'public' | 'private' | 'root';

/**
 * Task metadata for discovered tasks.
 */
export interface Task {
  /** Task name (filename without .js extension) */
  name: string;
  /** Task type indicating directory location */
  type: TaskType;
  /** Full path to the task file */
  path: string;
}

/**
 * Task information with content.
 */
export interface TaskWithContent extends Task {
  /** Raw file content */
  content: string;
}

/**
 * Repository for managing task file discovery and reading.
 */
export class TaskRepository {
  private readonly tasksDir: string;
  private readonly bundledTasksDir: string;
  private readonly publicDir: string;
  private readonly privateDir: string;

  constructor(tasksDir: string = TASKS_DIR, bundledTasksDir: string = BUNDLED_TASKS_DIR) {
    this.tasksDir = tasksDir;
    this.bundledTasksDir = bundledTasksDir;
    this.publicDir = path.join(tasksDir, 'public');
    this.privateDir = path.join(tasksDir, 'private');
  }

  /**
   * Discovers all tasks from public and private directories.
   * Tasks are returned with priority: private > public > root.
   * Example precedence:
   * - bundled/public/foo.js < bundled/private/foo.js < writable/public/foo.js
   *
   * @returns Promise resolving to array of unique tasks
   */
  async findAll(): Promise<Task[]> {
    const taskMap = new Map<string, Task>();
    const searchRoots = getTaskRoots(this.tasksDir, this.bundledTasksDir, 'bundled-first');

    // Apply root < private < public priority for each root.
    // Apply bundled < writable root priority overall by processing bundled first.
    for (const root of searchRoots) {
      const [publicTasks, privateTasks, rootTasks] = await Promise.all([
        this.getTasksFromDir('public', root),
        this.getTasksFromDir('private', root),
        this.getTasksFromRoot(root)
      ]);

      rootTasks.forEach(t => taskMap.set(t.name, t));
      privateTasks.forEach(t => taskMap.set(t.name, t));
      publicTasks.forEach(t => taskMap.set(t.name, t));
    }

    return Array.from(taskMap.values());
  }

  /**
   * Finds a specific task by name across all directories.
   * Returns the task with highest priority (private > public > root).
   *
   * @param name - Task name to find
   * @returns Promise resolving to the task or undefined if not found
   */
  async findByName(name: string): Promise<Task | undefined> {
    const allTasks = await this.findAll();
    return allTasks.find(t => t.name === name);
  }

  /**
   * Gets tasks from a specific subdirectory (public or private).
   *
   * @param dirName - Subdirectory name ('public' or 'private')
   * @returns Promise resolving to array of tasks from that directory
   */
  async getTasksFromDir(dirName: 'public' | 'private', tasksRoot: string = this.tasksDir): Promise<Task[]> {
    const dirPath = path.join(tasksRoot, dirName);
    const type = dirName;

    try {
      const files = await fs.readdir(dirPath);
      return files
        .filter((f): f is string => typeof f === 'string' && f.endsWith('.js'))
        .map((f): Task => ({
          name: f.replace('.js', ''),
          type,
          path: path.join(dirPath, f)
        }));
    } catch {
      // Directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Gets tasks from the root tasks directory.
   * This is for backward compatibility.
   *
   * @returns Promise resolving to array of tasks from root directory
   */
  async getTasksFromRoot(tasksRoot: string = this.tasksDir): Promise<Task[]> {
    try {
      const files = await fs.readdir(tasksRoot);
      return files
        .filter((f): f is string => typeof f === 'string' && f.endsWith('.js'))
        .map((f): Task => ({
          name: f.replace('.js', ''),
          type: 'root',
          path: path.join(tasksRoot, f)
        }));
    } catch {
      // Root directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Reads the content of a task file.
   *
   * @param name - Task name to read
   * @returns Promise resolving to task with content or undefined if not found
   */
  async readTask(name: string): Promise<TaskWithContent | undefined> {
    const task = await this.findByName(name);

    if (!task) {
      return undefined;
    }

    try {
      const content = await fs.readFile(task.path, 'utf-8');
      return {
        ...task,
        content
      };
    } catch (error) {
      console.error(`Error reading task file ${task.path}:`, error);
      return undefined;
    }
  }

  /**
   * Checks if a task file exists by name.
   *
   * @param name - Task name to check
   * @returns Promise resolving to true if task exists, false otherwise
   */
  async exists(name: string): Promise<boolean> {
    const task = await this.findByName(name);
    return task !== undefined;
  }

  /**
   * Gets the file path for a task by name.
   * Useful for dynamic task loading.
   *
   * @param name - Task name
   * @returns Promise resolving to the file path or undefined if not found
   */
  async getTaskPath(name: string): Promise<string | undefined> {
    const task = await this.findByName(name);
    return task?.path;
  }

  /**
   * Creates or updates a task file.
   *
   * @param name - Task name (without extension)
   * @param type - Task directory type (public/private)
   * @param content - JavaScript module content
   * @returns Promise resolving to the saved task metadata
   */
  async saveTask(name: string, type: 'public' | 'private', content: string): Promise<Task> {
    const dirPath = type === 'public' ? this.publicDir : this.privateDir;
    const taskPath = path.join(dirPath, `${name}.js`);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(taskPath, content, 'utf-8');

    return {
      name,
      type,
      path: taskPath,
    };
  }
}

// Export a singleton instance for convenience
export const taskRepository = new TaskRepository();
