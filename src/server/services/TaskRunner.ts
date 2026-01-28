/**
 * TaskRunner - Service for managing task process execution.
 *
 * This service handles spawning, monitoring, and cleanup of child processes
 * that run Ghost Runner tasks via npm scripts.
 *
 * @module server/services/TaskRunner
 */

import { spawn, ChildProcess } from 'child_process';
import { ROOT_DIR } from '../config';
import type { ParsedTaskStatus } from '../../types/task.types';

/**
 * Event types emitted by the TaskRunner during task execution.
 */
export type TaskEventType = 'stdout' | 'stderr' | 'close' | 'error';

/**
 * Task event data emitted by the TaskRunner.
 */
export interface TaskEventData {
  /** Event type */
  type: TaskEventType;
  /** Raw data string for stdout/stderr events */
  data?: string;
  /** Process exit code for close event */
  code?: number | null;
  /** Error object for error events */
  error?: Error;
}

/**
 * Configuration options for running a task.
 */
export interface TaskRunOptions {
  /** Working directory for the process (defaults to ROOT_DIR) */
  cwd?: string;
  /** Whether to use shell mode for spawning (defaults to true) */
  shell?: boolean;
  /** Callback for task events during execution */
  onEvent?: (event: TaskEventData) => void;
}

/**
 * Service for running Ghost Runner tasks as child processes.
 */
export class TaskRunner {
  private readonly defaultCwd: string;

  constructor(cwd: string = ROOT_DIR) {
    this.defaultCwd = cwd;
  }

  /**
   * Runs a task by spawning a child process.
   *
   * @param taskName - Name of the task to run
   * @param options - Optional configuration for the task run
   * @returns The spawned child process
   */
  run(taskName: string, options: TaskRunOptions = {}): ChildProcess {
    const { cwd = this.defaultCwd, shell = true, onEvent } = options;

    const child: ChildProcess = spawn('npm', ['run', 'bot', '--', `--task=${taskName}`], {
      cwd,
      shell
    });

    // Set up event handlers if callback is provided
    if (onEvent) {
      this.setupEventHandlers(child, taskName, onEvent);
    }

    return child;
  }

  /**
   * Runs the Playwright recorder for recording new tasks.
   *
   * @param taskName - Optional name for the new task
   * @param taskType - Type of task ('public' or 'private')
   * @param options - Optional configuration for the recorder run
   * @returns The spawned child process
   */
  record(taskName: string | undefined, taskType: string | undefined, options: TaskRunOptions = {}): ChildProcess {
    const { cwd = this.defaultCwd, shell = true, onEvent } = options;

    const args: string[] = ['run', 'record'];

    if (taskName && taskType) {
      args.push('--');
      args.push(`--name=${taskName}`);
      args.push(`--type=${taskType}`);
    }

    const child: ChildProcess = spawn('npm', args, {
      cwd,
      shell
    });

    // Set up event handlers if callback is provided
    if (onEvent) {
      this.setupEventHandlers(child, 'Recorder', onEvent);
    }

    return child;
  }

  /**
   * Runs the setup-login process for manual browser login.
   *
   * @param options - Optional configuration for the setup run
   * @returns The spawned child process
   */
  setupLogin(options: TaskRunOptions = {}): ChildProcess {
    const { cwd = this.defaultCwd, shell = true, onEvent } = options;

    const child: ChildProcess = spawn('npm', ['run', 'setup-login'], {
      cwd,
      shell
    });

    // Set up event handlers if callback is provided
    if (onEvent) {
      this.setupEventHandlers(child, 'Setup Login', onEvent);
    }

    return child;
  }

  /**
   * Sets up event handlers for a child process.
   *
   * @param child - The child process to monitor
   * @param taskName - Name of the task (for logging purposes)
   * @param onEvent - Callback for task events
   */
  private setupEventHandlers(child: ChildProcess, taskName: string, onEvent: (event: TaskEventData) => void): void {
    child.stdout?.on('data', (data: Buffer) => {
      onEvent({ type: 'stdout', data: data.toString() });
    });

    child.stderr?.on('data', (data: Buffer) => {
      onEvent({ type: 'stderr', data: data.toString() });
    });

    child.on('error', (err: Error) => {
      console.error(`[${taskName}] Spawn error:`, err);
      onEvent({ type: 'error', error: err });
    });

    child.on('close', (code: number | null) => {
      onEvent({ type: 'close', code });
    });
  }

  /**
   * Gracefully terminates a running task process.
   *
   * @param child - The child process to terminate
   * @param signal - Signal to send (defaults to 'SIGTERM')
   * @param timeout - Optional timeout before force killing (ms)
   */
  async terminate(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM', timeout?: number): Promise<boolean> {
    return new Promise((resolve) => {
      const forceKillTimeout = timeout
        ? setTimeout(() => {
            if (child.pid) {
              child.kill('SIGKILL');
            }
          }, timeout)
        : undefined;

      child.once('exit', () => {
        if (forceKillTimeout) {
          clearTimeout(forceKillTimeout);
        }
        resolve(true);
      });

      const killed = child.kill(signal);
      if (!killed) {
        if (forceKillTimeout) {
          clearTimeout(forceKillTimeout);
        }
        resolve(false);
      }
    });
  }

  /**
   * Checks if a child process is currently running.
   *
   * @param child - The child process to check
   * @returns True if the process is still running
   */
  isRunning(child: ChildProcess): boolean {
    return child.exitCode === null && !child.killed;
  }
}

// Export a singleton instance for convenience
export const taskRunner = new TaskRunner();
