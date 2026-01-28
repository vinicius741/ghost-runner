import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { validateTaskName } from '../server/utils/taskValidators';

const LOG_FILE = path.resolve(__dirname, '../../scheduler.log');
const CONFIG_FILE = path.resolve(__dirname, '../../schedule.json');

interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

let caffeinateProcess: ChildProcess | null = null;

/**
 * Logs a message with a timestamp to the console and a file.
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

/**
 * Starts the 'caffeinate' command to prevent the system from sleeping.
 */
function startCaffeinate(): void {
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
function stopCaffeinate(): void {
  if (!caffeinateProcess) return;

  log('Stopping caffeinate...');
  try {
    if (caffeinateProcess.pid) {
      process.kill(-caffeinateProcess.pid); // Kill the process group if detached
    }
  } catch (e) {
    if (caffeinateProcess) {
      caffeinateProcess.kill();
    }
  }
  caffeinateProcess = null;
}

/**
 * Checks if there are any tasks left to be executed.
 */
function hasTasksLeft(): boolean {
  if (!fs.existsSync(CONFIG_FILE)) return false;
  try {
    const scheduleConfig: ScheduleItem[] = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
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
    const err = error as Error;
    log(`Error checking tasks left: ${err.message}`);
    return false;
  }
}

/**
 * Re-evaluates if caffeinate should still be running.
 */
function updateCaffeinateStatus(): void {
  if (hasTasksLeft()) {
    startCaffeinate();
  } else {
    stopCaffeinate();
  }
}

/**
 * Executes a specific task by spawning a child process running tsx on index.ts
 */
function runTask(taskName: string): Promise<void> {
  return new Promise((resolve) => {
    // Validate task name for security
    const validationResult = validateTaskName(taskName);
    if (!validationResult.valid) {
      log(`Invalid task name '${taskName}': ${validationResult.error}. Skipping execution.`);
      updateCaffeinateStatus();
      resolve();
      return;
    }

    log(`Starting task: '${taskName}'`);

    const projectRoot = path.resolve(__dirname, '../..');
    // Use tsx directly from node_modules for better performance than npx
    const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
    const child = spawn(tsxBin, ['src/core/index.ts', `--task=${taskName}`], {
      cwd: projectRoot, // Run from project root
      stdio: 'inherit', // Pipe output so we see it in the main console
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        log(`Task '${taskName}' finished successfully.`);
      } else {
        log(`Task '${taskName}' failed with exit code ${code}.`);
      }
      // After a task finishes, a one-time task might have been removed, so re-evaluate.
      updateCaffeinateStatus();
      resolve();
    });

    child.on('error', (err: Error) => {
      log(`Error spawning task '${taskName}': ${err.message}`);
      updateCaffeinateStatus();
      resolve(); // Still resolve so the chain can continue or handle it
    });
  });
}

function startScheduler(): void {
  log('Initializing Scheduler...');

  if (!fs.existsSync(CONFIG_FILE)) {
    log(`Error: Configuration file not found at ${CONFIG_FILE}`);
    process.exit(1);
  }

  let scheduleConfig: ScheduleItem[];
  try {
    const rawData = fs.readFileSync(CONFIG_FILE, 'utf8');
    scheduleConfig = JSON.parse(rawData);
  } catch (error) {
    const err = error as Error;
    log(`Error parsing schedule.json: ${err.message}`);
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

      cron.schedule(cronExpression, async () => {
        try {
          await runTask(task);
        } catch (err) {
          const error = err as Error;
          log(`Unexpected error triggering cron task '${task}': ${error.message}`);
          log(`Error stack: ${error.stack}`);
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

      setTimeout(async () => {
        try {
          await runTask(task);
          // Remove from schedule.json
          try {
            const currentConfig: ScheduleItem[] = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            const newConfig = currentConfig.filter(t => t.task !== task || t.executeAt !== executeAt);
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
            log(`Removed one-time task '${task}' from schedule.`);
          } catch (ioErr) {
            const error = ioErr as Error;
            log(`Error removing one-time task '${task}' from schedule: ${error.message}`);
            log(`Error stack: ${error.stack}`);
          }
        } catch (err) {
          const error = err as Error;
          log(`Unexpected error triggering one-time task '${task}': ${error.message}`);
          log(`Error stack: ${error.stack}`);
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
