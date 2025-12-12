const { launchBrowser } = require('./browserConfig');
const fs = require('fs');
const path = require('path');

async function main() {
  // Parse command line arguments for --task
  const args = process.argv.slice(2);
  const taskArg = args.find(arg => arg.startsWith('--task='));
  
  if (!taskArg) {
    console.error('Error: No task specified.');
    console.error('Usage: node index.js --task=task_name');
    console.error('Available tasks:', fs.readdirSync(path.join(__dirname, 'tasks')).join(', '));
    process.exit(1);
  }

  const taskName = taskArg.split('=')[1];
  const taskPath = path.resolve(__dirname, 'tasks', `${taskName}.js`);

  if (!fs.existsSync(taskPath)) {
    console.error(`Error: Task file not found at ${taskPath}`);
    process.exit(1);
  }

  console.log(`Loading task: ${taskName}`);
  
  let browserContext;
  let page;

  try {
    // Launch the browser using our centralized config (Stealth + Persistent Profile)
    browserContext = await launchBrowser();
    
    // Get the default page or create new one
    const pages = browserContext.pages();
    page = pages.length > 0 ? pages[0] : await browserContext.newPage();

    console.log('Browser launched. executing task...');

    // Load the task module
    const taskModule = require(taskPath);
    
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
