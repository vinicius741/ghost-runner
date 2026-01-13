import fs from 'fs';
import path from 'path';

const TASKS_DIR = path.resolve(__dirname, '../../tasks');
console.log('TASKS_DIR:', TASKS_DIR);

const getTasksFromDir = (dirName: string): string[] => {
  const dirPath = path.join(TASKS_DIR, dirName);
  if (fs.existsSync(dirPath)) {
    console.log(`Reading from ${dirPath}`);
    return fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace('.js', ''));
  } else {
    console.log(`Directory not found: ${dirPath}`);
  }
  return [];
};

try {
  const publicTasks = getTasksFromDir('public');
  const privateTasks = getTasksFromDir('private');

  // Also check root for backward compatibility (optional, but good to have)
  const rootTasks = fs.readdirSync(TASKS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace('.js', ''));

  console.log('Public:', publicTasks);
  console.log('Private:', privateTasks);
  console.log('Root:', rootTasks);

  // distinct tasks
  const allTasks = [...new Set([...publicTasks, ...privateTasks, ...rootTasks])];
  console.log('All Tasks:', allTasks);
} catch (err) {
  console.error('Error:', err);
}
