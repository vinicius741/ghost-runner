import fs from 'fs';
import { Request, Response } from 'express';
import { SCHEDULE_FILE } from '../config';
import schedulerService from '../services/scheduler';
import { parseExpression } from 'cron-parser';

export interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

export const getStatus = (req: Request, res: Response): void => {
  res.json({ running: schedulerService.isRunning() });
};

export const start = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  if (schedulerService.isRunning()) {
    res.json({ message: 'Scheduler is already running.' });
    return;
  }

  schedulerService.start(io);
  res.json({ message: 'Scheduler started.' });
};

export const stop = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  if (schedulerService.stop(io)) {
    res.json({ message: 'Scheduler stopped.' });
  } else {
    res.json({ message: 'Scheduler is not running.' });
  }
};

export const getSchedule = (req: Request, res: Response): void => {
  if (fs.existsSync(SCHEDULE_FILE)) {
    fs.readFile(SCHEDULE_FILE, 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ error: 'Failed to read schedule file.' });
        return;
      }
      try {
        const schedule: ScheduleItem[] = JSON.parse(data);
        res.json({ schedule });
      } catch (e) {
        res.status(500).json({ error: 'Invalid JSON in schedule file.' });
      }
    });
  } else {
    res.json({ schedule: [] });
  }
};

export interface NextTask {
  task: string;
  nextRun: string;
  delayMs: number;
}

export const getNextTask = (req: Request, res: Response): void => {
  if (fs.existsSync(SCHEDULE_FILE)) {
    fs.readFile(SCHEDULE_FILE, 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ error: 'Failed to read schedule file.' });
        return;
      }
      try {
        const schedule: ScheduleItem[] = JSON.parse(data);
        if (!Array.isArray(schedule) || schedule.length === 0) {
          res.json({ nextTask: null });
          return;
        }

        const now = new Date();
        let nearestTask: NextTask | null = null;
        let minDelay = Infinity;

        schedule.forEach(item => {
          let nextRun: Date | null = null;
          if (item.cron) {
            try {
              const interval = parseExpression(item.cron);
              nextRun = interval.next().toDate();
            } catch (e) {
              console.error(`Invalid cron expression: ${item.cron}`);
            }
          } else if (item.executeAt) {
            nextRun = new Date(item.executeAt);
          }

          if (nextRun && nextRun > now) {
            const delay = nextRun.getTime() - now.getTime();
            if (delay < minDelay) {
              minDelay = delay;
              nearestTask = {
                task: item.task,
                nextRun: nextRun.toISOString(),
                delayMs: delay
              };
            }
          }
        });

        res.json({ nextTask: nearestTask });
      } catch (e) {
        res.status(500).json({ error: 'Invalid JSON in schedule file.' });
      }
    });
  } else {
    res.json({ nextTask: null });
  }
};

export const saveSchedule = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) {
    res.status(400).json({ error: 'Invalid schedule format. Expected an array.' });
    return;
  }

  fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to save schedule.' });
      return;
    }

    schedulerService.restart(io);

    res.json({ message: 'Schedule updated successfully.' });
  });
};
