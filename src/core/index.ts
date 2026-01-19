import { AgentBrowserCLI } from '../config/browserCli';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Task module interface for agent-browser based tasks
 * Tasks receive an AgentBrowserCLI instance instead of Playwright Page
 */
interface TaskModule {
  run: (cli: AgentBrowserCLI) => Promise<void>;
}

async function main(): Promise<void> {
  // Parse command line arguments for --task
  const args = process.argv.slice(2);
  const taskArg = args.find(arg => arg.startsWith('--task='));

  if (!taskArg) {
    console.error('Error: No task specified.');
    console.error('Usage: node index.js --task=task_name');
    const publicTasks = fs.existsSync(path.resolve(__dirname, '../../tasks/public'))
      ? fs.readdirSync(path.resolve(__dirname, '../../tasks/public')).map(f => `public/${f}`)
      : [];
    const privateTasks = fs.existsSync(path.resolve(__dirname, '../../tasks/private'))
      ? fs.readdirSync(path.resolve(__dirname, '../../tasks/private')).map(f => `private/${f}`)
      : [];
    console.error('Available tasks:', [...publicTasks, ...privateTasks].join(', '));
    process.exit(1);
  }

  const taskName = taskArg.split('=')[1];

  // Search for the task file in public or private directories
  const publicTaskPath = path.resolve(__dirname, '../../tasks/public', `${taskName}.js`);
  const privateTaskPath = path.resolve(__dirname, '../../tasks/private', `${taskName}.js`);

  let taskPath: string | undefined;
  if (fs.existsSync(publicTaskPath)) {
    taskPath = publicTaskPath;
  } else if (fs.existsSync(privateTaskPath)) {
    taskPath = privateTaskPath;
  } else {
    // Legacy support or check root if needed, but primarily check subdirs now
    const rootTaskPath = path.resolve(__dirname, '../../tasks', `${taskName}.js`);
    if (fs.existsSync(rootTaskPath)) {
      taskPath = rootTaskPath;
    }
  }

  if (!taskPath) {
    console.error(`Error: Task file '${taskName}.js' not found in tasks/public or tasks/private`);
    process.exit(1);
  }

  console.log(`Loading task: ${taskName}`);

  // Create CLI instance with task name as session name
  const cli = new AgentBrowserCLI(taskName);

  let taskFailed = false;

  try {
    console.log('Executing task with agent-browser...');

    // Load the task module
    const taskModule = require(taskPath) as TaskModule;

    if (typeof taskModule.run !== 'function') {
      throw new Error(`Task ${taskName} does not export a 'run' function.`);
    }

    // Execute the task with CLI instance
    await taskModule.run(cli);

    console.log(`Task '${taskName}' completed successfully.`);

  } catch (error) {
    taskFailed = true;
    console.error(`Task execution failed:`, error);
  } finally {
    // Ensure browser is closed
    console.log('Closing browser...');
    try {
      await cli.close();
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
    // Exit with non-zero code if task failed
    process.exit(taskFailed ? 1 : 0);
  }
}

main();
