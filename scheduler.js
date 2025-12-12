const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOG_FILE = path.join(__dirname, 'scheduler.log');
const CONFIG_FILE = path.join(__dirname, 'schedule.json');

/**
 * Logs a message with a timestamp to the console and a file.
 * @param {string} message 
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

/**
 * Executes a specific task by spawning a child process running 'node index.js'
 * @param {string} taskName 
 */
function runTask(taskName) {
  log(`Starting task: '${taskName}'`);

  const child = spawn('node', ['index.js', `--task=${taskName}`], {
    cwd: __dirname,
    stdio: 'inherit', // Pipe output so we see it in the main console
    shell: true
  });

  child.on('close', (code) => {
    if (code === 0) {
      log(`Task '${taskName}' finished successfully.`);
    } else {
      log(`Task '${taskName}' failed with exit code ${code}.`);
    }
  });

  child.on('error', (err) => {
    log(`Error spawning task '${taskName}': ${err.message}`);
  });
}

function startScheduler() {
  log('Initializing Scheduler...');

  if (!fs.existsSync(CONFIG_FILE)) {
    log(`Error: Configuration file not found at ${CONFIG_FILE}`);
    process.exit(1);
  }

  let scheduleConfig;
  try {
    const rawData = fs.readFileSync(CONFIG_FILE);
    scheduleConfig = JSON.parse(rawData);
  } catch (error) {
    log(`Error parsing schedule.json: ${error.message}`);
    process.exit(1);
  }

  log(`Loaded ${scheduleConfig.length} tasks from schedule.json`);

  scheduleConfig.forEach((item) => {
    const { task, cron: cronExpression } = item;

    if (!task || !cronExpression) {
      log(`Skipping invalid config entry: ${JSON.stringify(item)}`);
      return;
    }

    if (!cron.validate(cronExpression)) {
      log(`Invalid cron expression for task '${task}': ${cronExpression}`);
      return;
    }

    log(`Scheduling '${task}' with cron: '${cronExpression}'`);

    cron.schedule(cronExpression, () => {
      // Wrap in try-catch to ensure scheduler keeps running even if execution setup fails
      try {
        runTask(task);
      } catch (err) {
        log(`Unexpected error triggering task '${task}': ${err.message}`);
      }
    });
  });

  log('Scheduler is running. Press Ctrl+C to stop.');
}

startScheduler();
