import fs from 'fs';
import path from 'path';
import { TASKS_DIR } from '../config';

export type TaskType = 'public' | 'private' | 'root';

export interface Task {
  name: string;
  type: TaskType;
}

const getTasksFromDir = (dirName: string): Task[] => {
  const dirPath = path.join(TASKS_DIR, dirName);
  if (fs.existsSync(dirPath)) {
    return fs.readdirSync(dirPath)
      .filter((f): f is string => typeof f === 'string' && f.endsWith('.js'))
      .map((f): Task => ({
        name: f.replace('.js', ''),
        type: dirName === 'public' ? 'public' : (dirName === 'private' ? 'private' : 'root')
      }));
  }
  return [];
};

export { getTasksFromDir };
