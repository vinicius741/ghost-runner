const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOG_FILE = path.resolve(__dirname, '../../scheduler.log');
const CONFIG_FILE = path.resolve(__dirname, '../../schedule.json');

let caffeinateProcess = null;

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
 * Starts the 'caffeinate' command to prevent the system from sleeping.
 */
function startCaffeinate() {
  if (caffeinateProcess) return;

  log('Starting caffeinate to prevent system sleep...');
  caffeinateProcess = spawn('caffeinate', ['-i'], {
    stdio: 'ignore',
    detached: true
  });

  caffeinateProcess.on('error', (err) => {
    log(`Error starting caffeinate: ${err.message}`);
    caffeinateProcess = null;
  });

  caffeinateProcess.unref();
}

/**
 * Stops the 'caffeinate' command.
 */
function stopCaffeinate() {
  if (!caffeinateProcess) return;

  log('Stopping caffeinate...');
  try {
    process.kill(-caffeinateProcess.pid); // Kill the process group if detached
  } catch (e) {
    caffeinateProcess.kill();
  }
  caffeinateProcess = null;
}

/**
 * Checks if there are any tasks left to be executed.
 * @returns {boolean}
 */
function hasTasksLeft() {
  if (!fs.existsSync(CONFIG_FILE)) return false;
  try {
    const scheduleConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
    const now = new Date();
    return scheduleConfig.some(item => {
      if (item.cron) return true; // Cron tasks are always "left" as they repeat
      if (item.executeAt) {
        const executeTime = new Date(item.executeAt);
        return executeTime > now;
      }
      return false;
    });
  } catch (error) {
    log(`Error checking tasks left: ${error.message}`);
    return false;
  }
}

/**
 * Re-evaluates if caffeinate should still be running.
 */
function updateCaffeinateStatus() {
  if (hasTasksLeft()) {
    startCaffeinate();
  } else {
    stopCaffeinate();
  }
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
    // After a task finishes, a one-time task might have been removed, so re-evaluate.
    updateCaffeinateStatus();
  });

  child.on('error', (err) => {
    log(`Error spawning task '${taskName}': ${err.message}`);
    updateCaffeinateStatus();
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

  // Initial status update
  updateCaffeinateStatus();

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
        log(`Task '${task}' scheduled for ${executeAt} is past due. Executing immediately.`);
      } else {
        log(`Scheduling '${task}' once at ${executeAt} (in ${Math.round(delay / 60000)} minutes)`);
      }

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
      }, Math.max(0, delay));

    } else {
      log(`Skipping invalid config entry (no cron or executeAt): ${JSON.stringify(item)}`);
    }
  });

  log('Scheduler is running. Press Ctrl+C to stop.');
}

// Ensure caffeinate is stopped when the scheduler process exits
process.on('SIGINT', () => {
  stopCaffeinate();
  process.exit();
});

process.on('SIGTERM', () => {
  stopCaffeinate();
  process.exit();
});

process.on('exit', () => {
  stopCaffeinate();
});

startScheduler();
