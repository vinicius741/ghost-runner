/**
 * Validation schemas index.
 *
 * @module server/validators
 */

export {
  taskNameSchema,
  taskTypeSchema,
  MAX_TASK_CONTENT_SIZE,
  runTaskSchema,
  recordTaskSchema,
  uploadTaskSchema,
  type RunTaskInput,
  type RecordTaskInput,
  type UploadTaskInput,
} from './taskValidators';

export {
  scheduleItemSchema,
  scheduleArraySchema,
  saveScheduleSchema,
  type ScheduleItemInput,
  type SaveScheduleInput,
} from './scheduleValidators';

export {
  geolocationSchema,
  settingsSchema,
  saveSettingsSchema,
  isDefaultGeolocation,
  type SettingsInput,
  type SaveSettingsInput,
} from './settingsValidators';
