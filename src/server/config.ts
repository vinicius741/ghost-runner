import path from 'path';

// Default port - will try this first, then find available if in use
const DEFAULT_PORT = 3333;

export const PORT: number = parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10);
export const TASKS_DIR: string = path.resolve(__dirname, '../../tasks');
export const LOG_FILE: string = path.resolve(__dirname, '../../scheduler.log');
export const SETTINGS_FILE: string = path.resolve(__dirname, '../../settings.json');
export const SCHEDULE_FILE: string = path.resolve(__dirname, '../../schedule.json');
export const ROOT_DIR: string = path.resolve(__dirname, '../../');
