import fs from 'fs';
import { Request, Response } from 'express';
import { SETTINGS_FILE } from '../config';

export interface Settings {
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  headless?: boolean;
  profileDir?: string;
  browserChannel?: string;
  executablePath?: string;
  [key: string]: unknown;
}

export const getSettings = (req: Request, res: Response): void => {
  if (fs.existsSync(SETTINGS_FILE)) {
    fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ error: 'Failed to read settings file.' });
        return;
      }
      try {
        const settings: Settings = JSON.parse(data);
        res.json({ settings });
      } catch (e) {
        res.status(500).json({ error: 'Invalid JSON in settings file.' });
      }
    });
  } else {
    res.json({ settings: {} });
  }
};

export const saveSettings = (req: Request, res: Response): void => {
  const io = req.app.get('io');
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Invalid settings format.' });
    return;
  }

  fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to save settings.' });
      return;
    }
    res.json({ message: 'Settings updated successfully.' });
    if (io) io.emit('log', '[System] Global settings updated via UI.');
  });
};
