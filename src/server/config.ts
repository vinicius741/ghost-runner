import {
  APP_ROOT,
  DATA_ROOT,
  TASKS_DIR,
  BUNDLED_TASKS_DIR,
  LOG_FILE,
  SETTINGS_FILE,
  SCHEDULE_FILE,
  FAILURES_FILE,
  INFO_GATHERING_FILE,
  FRONTEND_DIST_DIR,
  SERVER_PUBLIC_DIR,
  getTaskRoots,
} from '../config/runtimePaths';

// Default port - will try this first, then find available if in use
const DEFAULT_PORT = 3333;

export const PORT: number = parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10);
export {
  TASKS_DIR,
  BUNDLED_TASKS_DIR,
  LOG_FILE,
  SETTINGS_FILE,
  SCHEDULE_FILE,
  FAILURES_FILE,
  INFO_GATHERING_FILE,
  FRONTEND_DIST_DIR,
  SERVER_PUBLIC_DIR,
  getTaskRoots,
};
export const ROOT_DIR: string = APP_ROOT;
export { APP_ROOT, DATA_ROOT };
