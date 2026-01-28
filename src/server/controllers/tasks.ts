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
import type { Server } from 'socket.io';
import { taskRepository } from '../repositories/TaskRepository';
import { taskExecutionService } from '../services/TaskExecutionService';

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
    console.error('Error in /api/tasks/run:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Internal Server Error: ${message}` });
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
    console.error('Error in /api/record:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Internal Server Error: ${message}` });
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
    console.error('Error in /api/setup-login:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Internal Server Error: ${message}` });
  }
};
