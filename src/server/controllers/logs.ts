import fs from 'fs';
import { Request, Response } from 'express';
import { LOG_FILE } from '../config';

export const getLogs = (req: Request, res: Response): void => {
  if (fs.existsSync(LOG_FILE)) {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ error: 'Failed to read log file.' });
        return;
      }
      res.json({ logs: data });
    });
  } else {
    res.json({ logs: 'No logs found.' });
  }
};
