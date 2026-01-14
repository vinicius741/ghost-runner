import { launchBrowser } from '../config/browserConfig';
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
  let page: Page;

  try {
    // Launch the browser using our centralized config (Stealth + Persistent Profile)
    browserContext = await launchBrowser();

    // Get the default page or create new one
    const pages = browserContext.pages();
    page = pages.length > 0 ? pages[0] : await browserContext.newPage();

    console.log('Browser launched. executing task...');

    // Load the task module
    const taskModule = require(taskPath) as TaskModule;

    if (typeof taskModule.run !== 'function') {
      throw new Error(`Task ${taskName} does not export a 'run' function.`);
    }

    // Execute the task
    await taskModule.run(page);

    console.log(`Task '${taskName}' completed successfully.`);

  } catch (error) {
    console.error(`Task execution failed:`, error);
  } finally {
    if (browserContext) {
      console.log('Closing browser...');
      // await browserContext.close(); // Optional: Comment out if you want to inspect after run
      // For a bot runner, we usually close it.
      await browserContext.close();
    }
    process.exit(0);
  }
}

main();
