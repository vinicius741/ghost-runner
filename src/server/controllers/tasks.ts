/**
 * Tasks controller - handles HTTP requests for task management.
 *
 * This controller has been refactored to use the service layer pattern:
 * - TaskRepository handles task file discovery
 * - TaskExecutionService orchestrates task execution workflow
 * - TaskRunner manages child process lifecycle
 * - FailureRepository handles failure persistence
 *
 * The controller is now a thin HTTP layer that delegates to services.
 *
 * @module server/controllers/tasks
 */

import { Request, Response } from 'express';
import vm from 'vm';
import path from 'path';
import type { Server } from 'socket.io';
import type { TaskSource, TaskSourceOrigin, TaskSourceSaveType, TaskType } from '../../../shared/types';
import { TASKS_DIR, BUNDLED_TASKS_DIR } from '../config';
import { taskRepository } from '../repositories/TaskRepository';
import { taskExecutionService } from '../services/TaskExecutionService';
import { handleControllerError, getErrorMessage } from '../utils/errorHandler';
import { validateTaskName } from '../utils/taskValidators';

function isWithinDir(filePath: string, dirPath: string): boolean {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDirPath = path.resolve(dirPath);
  return resolvedFilePath === resolvedDirPath || resolvedFilePath.startsWith(`${resolvedDirPath}${path.sep}`);
}

function getTaskSourceOrigin(taskPath: string): TaskSourceOrigin {
  return isWithinDir(taskPath, TASKS_DIR) ? 'writable' : 'bundled';
}

function getTaskSaveType(taskType: TaskType): TaskSourceSaveType {
  if (taskType === 'private') {
    return 'private';
  }

  return 'public';
}

/**
 * Controller function: GET /api/tasks
 *
 * Returns a list of all available tasks from public and private directories.
 * Tasks are returned with priority: private > public > root.
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await taskRepository.findAll();

    // Transform to simple format for API response
    const taskList = tasks.map(({ name, type }) => ({ name, type }));

    res.json({ tasks: taskList });
  } catch (err) {
    console.error('Error reading tasks:', err);
    res.status(500).json({ error: 'Failed to read tasks directory.' });
  }
};

/**
 * Controller function: GET /api/tasks/:taskName/source
 *
 * Returns source content and save metadata for a specific task.
 */
export const getTaskSource = async (req: Request, res: Response): Promise<void> => {
  const taskNameParam = req.params.taskName;
  const taskName = Array.isArray(taskNameParam) ? taskNameParam[0] : taskNameParam;
  const validationResult = validateTaskName(taskName);

  if (!validationResult.valid) {
    res.status(400).json({ error: validationResult.error });
    return;
  }

  try {
    const task = await taskRepository.readTask(taskName);

    if (!task) {
      res.status(404).json({ error: `Task '${taskName}' not found.` });
      return;
    }

    const taskSource: TaskSource = {
      name: task.name,
      type: task.type,
      content: task.content,
      sourceOrigin: getTaskSourceOrigin(task.path),
      saveType: getTaskSaveType(task.type),
    };

    res.json(taskSource);
  } catch (error) {
    handleControllerError(error, res, 'Error in /api/tasks/:taskName/source');
  }
};

/**
 * Controller function: POST /api/tasks/run
 *
 * Executes a task by spawning a child process.
 * Emits real-time updates via Socket.io.
 */
export const runTask = async (req: Request, res: Response): Promise<void> => {
  const io = req.app.get('io') as Server;
  const { taskName } = req.body;

  if (!taskName) {
    res.status(400).json({ error: 'Task name is required.' });
    return;
  }

  try {
    const result = await taskExecutionService.execute(taskName, { io });

    if (!result.success) {
      res.status(404).json({ error: result.message });
      return;
    }

    res.json({ message: result.message });
  } catch (error) {
    handleControllerError(error, res, 'Error in /api/tasks/run');
  }
};

/**
 * Controller function: POST /api/record
 *
 * Launches the Playwright Codegen recorder for recording new tasks.
 */
export const recordTask = (req: Request, res: Response): void => {
  const io = req.app.get('io') as Server;
  const { taskName, type } = req.body;

  try {
    const result = taskExecutionService.record(taskName, type, { io });
    res.json({ message: result.message });
  } catch (error) {
    handleControllerError(error, res, 'Error in /api/record');
  }
};

/**
 * Controller function: POST /api/setup-login
 *
 * Launches a browser for manual login session setup.
 */
export const setupLogin = (req: Request, res: Response): void => {
  const io = req.app.get('io') as Server;

  try {
    const result = taskExecutionService.setupLogin({ io });
    res.json({ message: result.message });
  } catch (error) {
    handleControllerError(error, res, 'Error in /api/setup-login');
  }
};

/**
 * Controller function: POST /api/upload-task
 *
 * Saves a task file sent from the UI to tasks/public or tasks/private.
 */
export const uploadTask = async (req: Request, res: Response): Promise<void> => {
  const io = req.app.get('io') as Server;
  const { taskName, type, content } = req.body as {
    taskName: string;
    type: 'public' | 'private';
    content: string;
  };

  try {
    try {
      // Syntax-only validation to catch malformed uploads early.
      new vm.Script(content, { filename: `${taskName}.js` });
    } catch (syntaxError) {
      const message = syntaxError instanceof Error ? syntaxError.message : 'Invalid JavaScript content.';
      res.status(400).json({ error: `Invalid JavaScript content: ${message}` });
      return;
    }

    const savedTask = await taskRepository.saveTask(taskName, type, content);
    io.emit('log', `[System] Task '${savedTask.name}' uploaded to ${savedTask.type}.`);
    res.json({
      message: `Task '${savedTask.name}' uploaded successfully.`,
      task: { name: savedTask.name, type: savedTask.type },
    });
  } catch (error) {
    handleControllerError(error, res, 'Error in /api/upload-task');
  }
};
