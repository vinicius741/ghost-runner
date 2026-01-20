import fs from 'fs/promises';
import { Request, Response } from 'express';
import { LOG_FILE } from '../config';

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    res.json({ logs: data });
  } catch (error) {
    if (error instanceof Object && 'code' in error && error.code === 'ENOENT') {
      res.json({ logs: 'No logs found.' });
    } else {
      console.error('Failed to read log file:', error);
      res.status(500).json({ error: 'Failed to read log file.' });
    }
  }
};
