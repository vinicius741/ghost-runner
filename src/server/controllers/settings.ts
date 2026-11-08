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

export const saveSettings = async (req: Request, res: Response): Promise<void> => {
  const io = req.app.get('io');
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Invalid settings format.' });
    return;
  }

  try {
    // Clients may post partial settings (e.g. the geolocation auto-save after
    // location detection), so merge with the stored file instead of replacing
    // it and losing headless/browserChannel/profileDir.
    let existing: Settings = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        existing = JSON.parse(await fs.promises.readFile(SETTINGS_FILE, 'utf8'));
      } catch (e) {
        console.warn(`Settings file '${SETTINGS_FILE}' is not valid JSON; overwriting it.`);
      }
    }

    const merged: Settings = { ...existing, ...settings };
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2));

    res.json({ message: 'Settings updated successfully.' });
    if (io) io.emit('log', '[System] Global settings updated via UI.');
  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
};
