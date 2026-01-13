import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { Request, Response } from 'express';
import { TASKS_DIR, ROOT_DIR } from '../config';
import { getTasksFromDir } from '../utils/fileSystem';

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

  child.stdout?.on('data', (data: Buffer) => {
    io.emit('log', `[Task: ${taskName}] ${data.toString()}`);
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
