const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOG_FILE = path.resolve(__dirname, '../../scheduler.log');
const CONFIG_FILE = path.resolve(__dirname, '../../schedule.json');

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
    cwd: __dirname, // Current directory is now src/core where index.js is
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
    const { task, cron: cronExpression, executeAt } = item;

    if (!task) {
        log(`Skipping invalid config entry (no task name): ${JSON.stringify(item)}`);
        return;
    }

    if (cronExpression) {
        // Handle Cron Schedule
        if (!cron.validate(cronExpression)) {
            log(`Invalid cron expression for task '${task}': ${cronExpression}`);
            return;
        }

        log(`Scheduling '${task}' with cron: '${cronExpression}'`);

        cron.schedule(cronExpression, () => {
            try {
                runTask(task);
            } catch (err) {
                log(`Unexpected error triggering task '${task}': ${err.message}`);
            }
        });

    } else if (executeAt) {
        // Handle One-time Schedule
        const executeTime = new Date(executeAt);
        const now = new Date();
        const delay = executeTime.getTime() - now.getTime();

        if (isNaN(delay)) {
            log(`Invalid date format for task '${task}': ${executeAt}`);
            return;
        }

        if (delay <= 0) {
            log(`Skipping one-time task '${task}' scheduled for ${executeAt} (Time passed)`);
            return;
        }

        log(`Scheduling '${task}' once at ${executeAt} (in ${Math.round(delay / 60000)} minutes)`);

        setTimeout(() => {
            try {
                runTask(task);
                // Remove from schedule.json
                try {
                    const currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
                    const newConfig = currentConfig.filter(t => t.task !== task || t.executeAt !== executeAt);
                    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
                    log(`Removed one-time task '${task}' from schedule.`);
                } catch (ioErr) {
                    log(`Error removing task from schedule: ${ioErr.message}`);
                }
            } catch (err) {
                log(`Unexpected error triggering task '${task}': ${err.message}`);
            }
        }, delay);

    } else {
        log(`Skipping invalid config entry (no cron or executeAt): ${JSON.stringify(item)}`);
    }
  });

  log('Scheduler is running. Press Ctrl+C to stop.');
}

startScheduler();
