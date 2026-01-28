/**
 * TaskExecutionService - Orchestrates task execution workflow.
 *
 * This service coordinates between repositories and the TaskRunner to provide
 * high-level task execution with proper logging, failure tracking, and event emission.
 *
 * @module server/services/TaskExecutionService
 */

import type { Server } from 'socket.io';
import type { ChildProcess } from 'child_process';
import { TaskRunner, taskRunner, TaskEventData } from './TaskRunner';
import { taskRepository } from '../repositories/TaskRepository';
import { failureRepository } from '../repositories/FailureRepository';
import { parseTaskStatus } from '../utils/taskParser';
import type { ParsedTaskStatus, TaskStatusData } from '../../types/task.types';
import * as infoGatheringController from '../controllers/infoGathering';
import { isInfoGatheringData } from '../../types/task.types';

/**
 * Result of a task execution request.
 */
export interface TaskExecutionResult {
  /** Whether the task was successfully started */
  success: boolean;
  /** Message describing the result */
  message: string;
  /** The spawned child process (if successful) */
  process?: ChildProcess;
}

/**
 * Callback for task status updates during execution.
 */
export type TaskStatusCallback = (
  status: 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED',
  data: TaskStatusData,
  taskName: string
) => void;

/**
 * Callback for log messages during execution.
 */
export type TaskLogCallback = (message: string, level?: 'info' | 'error') => void;

/**
 * Configuration options for task execution.
 */
export interface TaskExecutionOptions {
  /** Socket.io instance for emitting real-time events */
  io?: Server;
  /** Callback for task status updates */
  onStatus?: TaskStatusCallback;
  /** Callback for log messages */
  onLog?: TaskLogCallback;
}

/**
 * Service for orchestrating task execution with proper logging and failure tracking.
 */
export class TaskExecutionService {
  private readonly runner: TaskRunner;
  private readonly tasks: typeof taskRepository;
  private readonly failures: typeof failureRepository;

  constructor(
    runner: TaskRunner = taskRunner,
    tasks: typeof taskRepository = taskRepository,
    failures: typeof failureRepository = failureRepository
  ) {
    this.runner = runner;
    this.tasks = tasks;
    this.failures = failures;
  }

  /**
   * Executes a task by name with full monitoring and logging.
   *
   * @param taskName - Name of the task to execute
   * @param options - Optional configuration for execution
   * @returns Result indicating whether the task was started successfully
   */
  async execute(taskName: string, options: TaskExecutionOptions = {}): Promise<TaskExecutionResult> {
    const { io, onStatus, onLog } = options;

    // Validate task exists
    const taskExists = await this.tasks.exists(taskName);
    if (!taskExists) {
      const message = `Task '${taskName}' not found.`;
      this.emitLog(message, 'error', onLog, io);
      return { success: false, message };
    }

    const child = this.runner.run(taskName, {
      onEvent: (event: TaskEventData) => {
        this.handleTaskEvent(event, taskName, io, onStatus, onLog);
      }
    });

    return {
      success: true,
      message: `Task ${taskName} started.`,
      process: child
    };
  }

  /**
   * Executes the Playwright recorder for recording new tasks.
   *
   * @param taskName - Optional name for the new task
   * @param taskType - Type of task ('public' or 'private')
   * @param options - Optional configuration for execution
   * @returns Result indicating whether the recorder was started successfully
   */
  record(taskName: string | undefined, taskType: string | undefined, options: TaskExecutionOptions = {}): TaskExecutionResult {
    const { io, onLog } = options;

    const child = this.runner.record(taskName, taskType, {
      onEvent: (event: TaskEventData) => {
        this.handleRecorderEvent(event, onLog, io);
      }
    });

    return {
      success: true,
      message: 'Recorder started.',
      process: child
    };
  }

  /**
   * Executes the setup-login process for manual browser login.
   *
   * @param options - Optional configuration for execution
   * @returns Result indicating whether setup was started successfully
   */
  setupLogin(options: TaskExecutionOptions = {}): TaskExecutionResult {
    const { io, onLog } = options;

    const child = this.runner.setupLogin({
      onEvent: (event: TaskEventData) => {
        this.handleSetupLoginEvent(event, onLog, io);
      }
    });

    return {
      success: true,
      message: 'Setup login started. Browser should open soon.',
      process: child
    };
  }

  /**
   * Handles events from a running task process.
   *
   * @param event - The task event
   * @param taskName - Name of the task
   * @param io - Optional Socket.io instance
   * @param onStatus - Optional status callback
   * @param onLog - Optional log callback
   */
  private handleTaskEvent(
    event: TaskEventData,
    taskName: string,
    io?: Server,
    onStatus?: TaskStatusCallback,
    onLog?: TaskLogCallback
  ): void {
    const { type, data, code, error } = event;

    switch (type) {
      case 'stdout':
        if (data) {
          this.handleTaskStdout(data, taskName, io, onStatus, onLog);
        }
        break;

      case 'stderr':
        if (data) {
          this.emitLog(`[Task: ${taskName} ERROR] ${data}`, 'error', onLog, io);
        }
        break;

      case 'close':
        this.emitLog(`[Task: ${taskName}] process exited with code ${code}`, 'info', onLog, io);
        break;

      case 'error':
        this.emitLog(`[Task: ${taskName} SYSTEM ERROR] Failed to spawn process: ${error?.message}`, 'error', onLog, io);
        break;
    }
  }

  /**
   * Handles stdout data from a task, parsing for status markers.
   *
   * @param data - Raw stdout data
   * @param taskName - Name of the task
   * @param io - Optional Socket.io instance
   * @param onStatus - Optional status callback
   * @param onLog - Optional log callback
   */
  private handleTaskStdout(
    data: string,
    taskName: string,
    io?: Server,
    onStatus?: TaskStatusCallback,
    onLog?: TaskLogCallback
  ): void {
    const lines = data.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parseTaskStatus(line);
      if (parsed) {
        this.handleTaskStatus(parsed, taskName, io, onStatus, onLog);
      } else {
        // No status marker - emit as regular log
        this.emitLog(`[Task: ${taskName}] ${line}`, 'info', onLog, io);
      }
    }
  }

  /**
   * Handles a parsed task status update.
   *
   * @param parsed - The parsed task status
   * @param taskName - Name of the task
   * @param io - Optional Socket.io instance
   * @param onStatus - Optional status callback
   * @param onLog - Optional log callback
   */
  private handleTaskStatus(
    parsed: ParsedTaskStatus,
    taskName: string,
    io?: Server,
    onStatus?: TaskStatusCallback,
    onLog?: TaskLogCallback
  ): void {
    const { status, data } = parsed;

    // Update task name if provided
    const currentTaskName = data.taskName || taskName;

    switch (status) {
      case 'STARTED':
        this.emitStatus('STARTED', data, currentTaskName, onStatus, io);
        if (io) {
          io.emit('task-started', { taskName: currentTaskName, timestamp: data.timestamp });
        }
        break;

      case 'COMPLETED':
        this.emitStatus('COMPLETED', data, currentTaskName, onStatus, io);
        if (io) {
          io.emit('task-completed', { taskName: currentTaskName, timestamp: data.timestamp });
        }
        this.emitLog(`[Task: ${currentTaskName}] ✓ Completed successfully`, 'info', onLog, io);
        break;

      case 'COMPLETED_WITH_DATA':
        // Store the info-gathering result using type guard for safety
        if (isInfoGatheringData(data)) {
          infoGatheringController.storeInfoGatheringResult(
            currentTaskName,
            data.data,
            data.metadata || {},
            io
          );
        } else {
          console.warn(`[Task: ${currentTaskName}] COMPLETED_WITH_DATA status missing data or metadata`);
        }
        this.emitStatus('COMPLETED_WITH_DATA', data, currentTaskName, onStatus, io);
        if (io) {
          io.emit('task-completed', {
            taskName: currentTaskName,
            timestamp: data.timestamp,
            hasData: true
          });
        }
        this.emitLog(`[Task: ${currentTaskName}] ✓ Completed with data`, 'info', onLog, io);
        break;

      case 'FAILED':
        // Record the failure and emit events
        void this.recordFailure(currentTaskName, data, io, onStatus, onLog);
        break;
    }
  }

  /**
   * Records a task failure and emits related Socket.io events.
   *
   * @param taskName - Name of the task that failed
   * @param data - Task status data containing error information
   * @param io - Optional Socket.io instance for emitting events
   * @param onStatus - Optional status callback
   * @param onLog - Optional log callback
   */
  private async recordFailure(
    taskName: string,
    data: TaskStatusData,
    io?: Server,
    onStatus?: TaskStatusCallback,
    onLog?: TaskLogCallback
  ): Promise<void> {
    const failure = await this.failures.record(
      taskName,
      data.errorType || 'unknown',
      data.errorMessage || 'Unknown error',
      data.errorContext || {}
    );

    // Emit failure recorded event
    if (io) {
      io.emit('failure-recorded', failure);
    }

    // Emit task failed status
    this.emitStatus('FAILED', data, taskName, onStatus, io);
    if (io) {
      io.emit('task-failed', {
        taskName,
        errorType: data.errorType,
        errorMessage: data.errorMessage,
        timestamp: data.timestamp
      });
    }
    this.emitLog(`[Task: ${taskName}] ✗ Failed: ${data.errorMessage || 'Unknown error'}`, 'error', onLog, io);
  }

  /**
   * Handles events from the recorder process.
   *
   * @param event - The task event
   * @param onLog - Optional log callback
   * @param io - Optional Socket.io instance
   */
  private handleRecorderEvent(event: TaskEventData, onLog?: TaskLogCallback, io?: Server): void {
    const { type, data, code, error } = event;

    switch (type) {
      case 'stdout':
        if (data) {
          this.emitLog(`[Recorder] ${data}`, 'info', onLog, io);
        }
        break;
      case 'stderr':
        if (data) {
          this.emitLog(`[Recorder ERROR] ${data}`, 'error', onLog, io);
        }
        break;
      case 'error':
        this.emitLog(`[Recorder SYSTEM ERROR] Failed to spawn process: ${error?.message}`, 'error', onLog, io);
        break;
      case 'close':
        if (code !== 0) {
          this.emitLog(`[Recorder] Process exited with code ${code}`, 'info', onLog, io);
        }
        break;
    }
  }

  /**
   * Handles events from the setup-login process.
   *
   * @param event - The task event
   * @param onLog - Optional log callback
   * @param io - Optional Socket.io instance
   */
  private handleSetupLoginEvent(event: TaskEventData, onLog?: TaskLogCallback, io?: Server): void {
    const { type, data, error } = event;

    switch (type) {
      case 'stdout':
        if (data) {
          this.emitLog(`[Setup Login] ${data}`, 'info', onLog, io);
        }
        break;
      case 'stderr':
        if (data) {
          this.emitLog(`[Setup Login ERROR] ${data}`, 'error', onLog, io);
        }
        break;
      case 'error':
        this.emitLog(`[Setup Login SYSTEM ERROR] Failed to spawn process: ${error?.message}`, 'error', onLog, io);
        break;
      case 'close':
        this.emitLog(`[Setup Login] Process finished`, 'info', onLog, io);
        break;
    }
  }

  /**
   * Helper method to emit status updates to both callback and Socket.io.
   */
  private emitStatus(
    status: 'STARTED' | 'COMPLETED' | 'COMPLETED_WITH_DATA' | 'FAILED',
    data: TaskStatusData,
    taskName: string,
    onStatus?: TaskStatusCallback,
    io?: Server
  ): void {
    if (onStatus) {
      onStatus(status, data, taskName);
    }
  }

  /**
   * Helper method to emit log messages to both callback and Socket.io.
   */
  private emitLog(message: string, level: 'info' | 'error', onLog?: TaskLogCallback, io?: Server): void {
    if (onLog) {
      onLog(message, level);
    }
    if (io) {
      io.emit('log', message);
    }
  }
}

// Export a singleton instance for convenience
export const taskExecutionService = new TaskExecutionService();
