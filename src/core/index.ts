import { launchBrowser } from '../config/browserConfig';
import { createMonitoredPage, MonitoredPage } from './pageWrapper';
import { reportTaskResult, reportTaskStarted, getExitCode } from './taskReporter';
import fs from 'fs';
import path from 'path';
import type { Page } from 'playwright';

interface TaskModule {
  run: (page: Page) => Promise<void>;
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

  let browserContext;
  let page: MonitoredPage;
  let taskError: unknown = undefined;

  try {
    // Launch the browser using our centralized config (Stealth + Persistent Profile)
    browserContext = await launchBrowser();

    // Get the default page or create new one
    const pages = browserContext.pages();
    const rawPage = pages.length > 0 ? pages[0] : await browserContext.newPage();

    // Wrap the page with monitoring for automatic failure detection
    page = createMonitoredPage(rawPage, taskName);

    // Report task start to server for real-time tracking
    reportTaskStarted(taskName);

    console.log('Browser launched. Executing task...');

    // Load the task module
    const taskModule = require(taskPath) as TaskModule;

    if (typeof taskModule.run !== 'function') {
      throw new Error(`Task ${taskName} does not export a 'run' function.`);
    }

    // Execute the task (with automatic error detection via MonitoredPage)
    // Cast to Page since MonitoredPage implements all needed methods
    await taskModule.run(page as unknown as Page);

    console.log(`Task '${taskName}' completed successfully.`);
  } catch (error) {
    taskError = error;
    console.error(`Task execution failed:`, error);
  } finally {
    // Report the task result (emits [TASK_STATUS:...] to stdout)
    const result = reportTaskResult(taskName, taskError);

    if (browserContext) {
      console.log('Closing browser...');
      await browserContext.close();
    }

    // Exit with appropriate code (0 for success, 1 for failure)
    process.exit(getExitCode(result));
  }
}

main();
