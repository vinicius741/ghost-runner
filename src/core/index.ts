import { launchBrowser } from '../config/browserConfig';
import { createMonitoredPage, MonitoredPage } from './pageWrapper';
import { reportTaskResult, reportTaskStarted, getExitCode, reportTaskResultWithData } from './taskReporter';
import fs from 'fs';
import path from 'path';
import type { Page } from 'playwright';
import { TASKS_DIR, initializeRuntimeStorage } from '../config/runtimePaths';

/**
 * Task metadata for declaring task type and display settings.
 */
export interface TaskMetadata {
  /** Task type - 'action' for side-effect tasks, 'info-gathering' for data-returning tasks */
  type?: 'action' | 'info-gathering';
  /** Category for grouping in UI */
  category?: string;
  /** Human-readable display name */
  displayName?: string;
  /** How to render the data in UI */
  dataType?: 'key-value' | 'table' | 'custom';
  /** Time-to-live for cached data in milliseconds (default 7 days) */
  ttl?: number;
}

interface TaskModule {
  run: (page: Page) => Promise<void | unknown>;
  metadata?: TaskMetadata;
}

async function main(): Promise<void> {
  initializeRuntimeStorage();

  // Parse command line arguments for --task
  const args = process.argv.slice(2);
  const taskArg = args.find(arg => arg.startsWith('--task='));

  if (!taskArg) {
    console.error('Error: No task specified.');
    console.error('Usage: node index.js --task=task_name');
    const publicTasks = fs.existsSync(path.join(TASKS_DIR, 'public'))
      ? fs.readdirSync(path.join(TASKS_DIR, 'public')).map(f => `public/${f}`)
      : [];
    const privateTasks = fs.existsSync(path.join(TASKS_DIR, 'private'))
      ? fs.readdirSync(path.join(TASKS_DIR, 'private')).map(f => `private/${f}`)
      : [];
    console.error('Available tasks:', [...publicTasks, ...privateTasks].join(', '));
    process.exit(1);
  }

  const taskName = taskArg.split('=')[1];

  // Search for the task file in public or private directories
  const publicTaskPath = path.join(TASKS_DIR, 'public', `${taskName}.js`);
  const privateTaskPath = path.join(TASKS_DIR, 'private', `${taskName}.js`);

  let taskPath: string | undefined;
  if (fs.existsSync(publicTaskPath)) {
    taskPath = publicTaskPath;
  } else if (fs.existsSync(privateTaskPath)) {
    taskPath = privateTaskPath;
  } else {
    // Legacy support or check root if needed, but primarily check subdirs now
    const rootTaskPath = path.join(TASKS_DIR, `${taskName}.js`);
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
    const result = await taskModule.run(page as unknown as Page);

    // If this is an info-gathering task and returned data, emit the result
    if (taskModule.metadata?.type === 'info-gathering' && result !== undefined) {
      reportTaskResultWithData(taskName, result, taskModule.metadata);
    }

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
