/**
 * Info Gathering controller - manages task result data persistence.
 * Results are stored in info-gathering.json in the root directory.
 */

import { promises as fs } from 'fs';
import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
import { INFO_GATHERING_FILE } from '../config';

// Constants
const DEFAULT_TTL_MS = 604800000; // 7 days in milliseconds
const STORAGE_VERSION = 1;
const MAX_TASK_NAME_LENGTH = 100;
const VALID_TASK_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates that a string is a valid ISO 8601 date string.
 */
function isValidISODate(value: string): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Validates task name to prevent path traversal and injection attacks.
 * Returns the validated name or throws an error.
 */
export function validateTaskName(taskName: unknown): string {
  if (typeof taskName !== 'string') {
    throw new Error('Task name must be a string');
  }
  if (taskName.length === 0 || taskName.length > MAX_TASK_NAME_LENGTH) {
    throw new Error(`Task name must be between 1 and ${MAX_TASK_NAME_LENGTH} characters`);
  }
  if (!VALID_TASK_NAME_PATTERN.test(taskName)) {
    throw new Error('Task name can only contain letters, numbers, hyphens, and underscores');
  }
  return taskName;
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 */
export function escapeHtml(unsafe: unknown): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Recursively escapes all string values in an object to prevent XSS.
 */
export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'string') {
    return escapeHtml(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[escapeHtml(key)] = sanitizeData(value);
    }
    return sanitized;
  }
  return data;
}

/**
 * Data structure for the info-gathering.json file.
 */
interface InfoGatheringData {
  version: number;
  tasks: Record<string, TaskResultEntry>;
}

/**
 * Single task result entry.
 */
export interface TaskResultEntry {
  taskName: string;
  category: string;
  displayName: string;
  data: unknown;
  lastUpdated: string;
  expiresAt?: string;
  metadata: {
    dataType: 'key-value' | 'table' | 'custom';
    renderedBy?: string;
  };
}

/**
 * Simple file lock to prevent concurrent write conflicts.
 */
class FileLock {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const nextResolve = this.waitQueue.shift();
      if (nextResolve) nextResolve();
    } else {
      this.locked = false;
    }
  }
}

const fileLock = new FileLock();

/**
 * Cleans up expired entries from the tasks object.
 */
function cleanupExpiredTasks(tasks: Record<string, TaskResultEntry>): Record<string, TaskResultEntry> {
  const now = Date.now();
  const cleaned: Record<string, TaskResultEntry> = {};

  for (const [key, task] of Object.entries(tasks)) {
    // Skip if expiresAt is missing or invalid
    if (!task.expiresAt || !isValidISODate(task.expiresAt)) {
      cleaned[key] = task;
      continue;
    }

    // Check if expired
    const expiryDate = new Date(task.expiresAt).getTime();
    if (expiryDate > now) {
      cleaned[key] = task;
    }
  }

  return cleaned;
}

/**
 * Reads all task results from the JSON file.
 */
async function readInfoGatheringFile(): Promise<InfoGatheringData> {
  try {
    const content = await fs.readFile(INFO_GATHERING_FILE, 'utf-8');
    const data = JSON.parse(content) as InfoGatheringData;
    // Ensure version field exists
    if (typeof data.version !== 'number') {
      data.version = STORAGE_VERSION;
    }
    if (typeof data.tasks !== 'object') {
      data.tasks = {};
    }
    return data;
  } catch (error) {
    // File doesn't exist yet - return empty structure (normal on first run)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: STORAGE_VERSION, tasks: {} };
    }
    // Log unexpected errors and return empty structure
    console.error('Error reading info-gathering file:', error);
    return { version: STORAGE_VERSION, tasks: {} };
  }
}

/**
 * Writes task results to the JSON file with file locking.
 */
async function writeInfoGatheringFile(data: InfoGatheringData): Promise<void> {
  await fileLock.acquire();
  try {
    await fs.writeFile(INFO_GATHERING_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    fileLock.release();
  }
}

/**
 * Stores a task result from an info-gathering task execution.
 *
 * @param taskName - Name of the task
 * @param data - The data returned by the task
 * @param metadata - Task metadata (category, displayName, dataType, ttl)
 * @param io - Optional Socket.io server instance for emitting events
 */
export async function storeInfoGatheringResult(
  taskName: string,
  data: unknown,
  metadata: { category?: string; displayName?: string; dataType?: string; ttl?: number; renderedBy?: string },
  io?: Server
): Promise<TaskResultEntry> {
  // Validate task name
  const validatedTaskName = validateTaskName(taskName);

  const fileData = await readInfoGatheringFile();

  // Clean up expired entries before writing new data
  fileData.tasks = cleanupExpiredTasks(fileData.tasks);

  const ttl = metadata.ttl ?? DEFAULT_TTL_MS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl).toISOString();

  // Validate and sanitize the data
  const sanitizedData = sanitizeData(data);
  const sanitizedCategory = escapeHtml(metadata.category || 'Uncategorized');
  const sanitizedDisplayName = escapeHtml(metadata.displayName || validatedTaskName);

  const entry: TaskResultEntry = {
    taskName: validatedTaskName,
    category: sanitizedCategory,
    displayName: sanitizedDisplayName,
    data: sanitizedData,
    lastUpdated: now.toISOString(),
    expiresAt,
    metadata: {
      dataType: (metadata.dataType as 'key-value' | 'table' | 'custom') || 'key-value',
      renderedBy: metadata.renderedBy
    }
  };

  fileData.tasks[validatedTaskName] = entry;
  await writeInfoGatheringFile(fileData);

  // Emit Socket.io event
  if (io) {
    io.emit('info-gathering-result-updated', entry);
  }

  return entry;
}

/**
 * Controller function: GET /api/info-gathering
 * Retrieves all stored task results, filtering out expired entries.
 */
export const getInfoGatheringData = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await readInfoGatheringFile();
    const now = Date.now();

    // Filter expired results
    const activeResults = Object.values(data.tasks).filter(
      (task) => !task.expiresAt || !isValidISODate(task.expiresAt) || new Date(task.expiresAt).getTime() > now
    );

    res.json({ results: activeResults });
  } catch (error) {
    console.error('Error getting info-gathering data:', error);
    res.status(500).json({ error: 'Failed to read info-gathering data.' });
  }
};

/**
 * Controller function: DELETE /api/info-gathering/:taskName
 * Clears a specific task result.
 */
export const clearTaskResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskName } = req.params;

    // Validate task name to prevent path traversal
    const validatedTaskName = validateTaskName(taskName);

    const data = await readInfoGatheringFile();

    if (data.tasks[validatedTaskName]) {
      delete data.tasks[validatedTaskName];
      await writeInfoGatheringFile(data);

      const io = req.app.get('io') as Server;
      io.emit('info-gathering-result-cleared', { taskName: validatedTaskName });

      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Task result not found.' });
    }
  } catch (error) {
    console.error('Error clearing task result:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: `Failed to clear task result: ${message}` });
  }
};

/**
 * Controller function: DELETE /api/info-gathering
 * Clears all task results.
 */
export const clearAllResults = async (req: Request, res: Response): Promise<void> => {
  try {
    await writeInfoGatheringFile({ version: STORAGE_VERSION, tasks: {} });

    const io = req.app.get('io') as Server;
    io.emit('info-gathering-all-cleared');

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing all results:', error);
    res.status(500).json({ error: 'Failed to clear all results.' });
  }
};
