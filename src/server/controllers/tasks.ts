import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { Request, Response } from 'express';
import { TASKS_DIR, ROOT_DIR } from '../config';
import { getTasksFromDir } from '../utils/fileSystem';
import * as failuresController from '../controllers/failures';

/**
 * Parsed task status data from stdout markers.
 */
export interface TaskStatusData {
  taskName?: string;
  timestamp?: string;
  errorType?: string;
  errorMessage?: string;
  errorContext?: Record<string, unknown>;
}

/**
 * Parsed task status result.
 */
export interface ParsedTaskStatus {
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  data: TaskStatusData;
}

/**
 * Type guard for valid task status values.
 */
function isValidTaskStatus(status: string): status is 'STARTED' | 'COMPLETED' | 'FAILED' {
  return status === 'STARTED' || status === 'COMPLETED' || status === 'FAILED';
}

/**
 * Parses task status from stdout lines.
 * Looks for [TASK_STATUS:STARTED|COMPLETED|FAILED] markers.
 */
function parseTaskStatus(line: string): ParsedTaskStatus | null {
  const STATUS_PREFIX = '[TASK_STATUS:';
  const startIndex = line.indexOf(STATUS_PREFIX);

  if (startIndex === -1) return null;

  const endIndex = line.indexOf(']', startIndex);
  if (endIndex === -1) return null;

  const status = line.substring(startIndex + STATUS_PREFIX.length, endIndex);
  const jsonPart = line.substring(endIndex + 1);

  if (!isValidTaskStatus(status)) return null;

  try {
    const data = jsonPart ? JSON.parse(jsonPart) : {};
    return { status, data };
  } catch {
    return { status, data: {} };
  }
}

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const [publicTasks, privateTasks] = await Promise.all([
      getTasksFromDir('public'),
      getTasksFromDir('private')
    ]);

    // Also check root for backward compatibility
    let rootTasks: Array<{ name: string; type: 'root' }> = [];
    try {
      const rootPath = TASKS_DIR;
      const files = await fs.readdir(rootPath);
      rootTasks = files
        .filter(f => f.endsWith('.js'))
        .map(f => ({
          name: f.replace('.js', ''),
          type: 'root' as const
        }));
    } catch {
      // Root directory doesn't exist or can't be read
      rootTasks = [];
    }

    const taskMap = new Map<string, { name: string; type: string }>();

    // Root first (lowest priority)
    rootTasks.forEach(t => taskMap.set(t.name, t));
    // Private next
    privateTasks.forEach(t => taskMap.set(t.name, t));
    // Public last (highest priority)
    publicTasks.forEach(t => taskMap.set(t.name, t));

    res.json({ tasks: Array.from(taskMap.values()) });
  } catch (err) {
    console.error('Error reading tasks:', err);
    res.status(500).json({ error: 'Failed to read tasks directory.' });
  }
};

export const runTask = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  const { taskName } = req.body;
  if (!taskName) {
    res.status(400).json({ error: 'Task name is required.' });
    return;
  }

  const child: ChildProcess = spawn('npm', ['run', 'bot', '--', `--task=${taskName}`], {
    cwd: ROOT_DIR,
    shell: true
  });

  let currentTaskName = taskName;

  child.stdout?.on('data', (data: Buffer) => {
    const output = data.toString();

    // Check each line for task status markers
    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parseTaskStatus(line);
      if (parsed) {
        const { status, data } = parsed;

        if (data.taskName) {
          currentTaskName = data.taskName;
        }

        switch (status) {
          case 'STARTED':
            io.emit('task-started', { taskName: currentTaskName, timestamp: data.timestamp });
            break;
          case 'COMPLETED':
            io.emit('task-completed', { taskName: currentTaskName, timestamp: data.timestamp });
            io.emit('log', `[Task: ${currentTaskName}] ✓ Completed successfully`);
            break;
          case 'FAILED':
            // Record the failure
            const errorContext = data.errorContext || {};
            failuresController.recordFailure(
              currentTaskName,
              data.errorType || 'unknown',
              data.errorMessage || 'Unknown error',
              errorContext,
              io
            );
            io.emit('task-failed', {
              taskName: currentTaskName,
              errorType: data.errorType,
              errorMessage: data.errorMessage,
              timestamp: data.timestamp
            });
            io.emit('log', `[Task: ${currentTaskName}] ✗ Failed: ${data.errorMessage || 'Unknown error'}`, 'error');
            break;
        }
      } else {
        // No status marker - emit as regular log
        io.emit('log', `[Task: ${taskName}] ${line}`);
      }
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    io.emit('log', `[Task: ${taskName} ERROR] ${data.toString()}`);
  });

  child.on('close', (code: number | null) => {
    io.emit('log', `[Task: ${taskName}] process exited with code ${code}`);
  });

  res.json({ message: `Task ${taskName} started.` });
};

export const recordTask = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  try {
    const { taskName, type } = req.body;

    const args: string[] = ['run', 'record'];

    if (taskName && type) {
      args.push('--');
      args.push(`--name=${taskName}`);
      args.push(`--type=${type}`);
    }

    const child: ChildProcess = spawn('npm', args, {
      cwd: ROOT_DIR,
      shell: true
    });

    child.stdout?.on('data', (data: Buffer) => {
      io.emit('log', `[Recorder] ${data.toString()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      io.emit('log', `[Recorder ERROR] ${data.toString()}`);
    });

    child.on('error', (err: Error) => {
      console.error('Spawn error:', err);
      io.emit('log', `[Recorder SYSTEM ERROR] Failed to spawn process: ${err.message}`);
    });

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        io.emit('log', `[Recorder] Process exited with code ${code}`);
      }
    });

    res.json({ message: 'Recorder started.' });
  } catch (error) {
    console.error('Error in /api/record:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Internal Server Error: ${message}` });
  }
};

export const setupLogin = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  try {
    const child: ChildProcess = spawn('npm', ['run', 'setup-login'], {
      cwd: ROOT_DIR,
      shell: true
    });

    child.stdout?.on('data', (data: Buffer) => {
      io.emit('log', `[Setup Login] ${data.toString()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      io.emit('log', `[Setup Login ERROR] ${data.toString()}`);
    });

    child.on('error', (err: Error) => {
      console.error('Spawn error:', err);
      io.emit('log', `[Setup Login SYSTEM ERROR] Failed to spawn process: ${err.message}`);
    });

    child.on('close', (code: number | null) => {
      io.emit('log', `[Setup Login] Process finished with code ${code}`);
    });

    res.json({ message: 'Setup login started. Browser should open soon.' });
  } catch (error) {
    console.error('Error in /api/setup-login:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Internal Server Error: ${message}` });
  }
};
