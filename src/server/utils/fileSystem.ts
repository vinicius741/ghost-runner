import * as fs from 'fs/promises';
import path from 'path';
import { TASKS_DIR } from '../config';

export type TaskType = 'public' | 'private' | 'root';

export interface Task {
  name: string;
  type: TaskType;
}

const getTasksFromDir = async (dirName: string): Promise<Task[]> => {
  const dirPath = path.join(TASKS_DIR, dirName);
  try {
    const files = await fs.readdir(dirPath);
    return files
      .filter((f): f is string => typeof f === 'string' && f.endsWith('.js'))
      .map((f): Task => ({
        name: f.replace('.js', ''),
        type: dirName === 'public' ? 'public' : (dirName === 'private' ? 'private' : 'root')
      }));
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
};

export { getTasksFromDir };
