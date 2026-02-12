/**
 * Validation schemas index.
 *
 * @module server/validators
 */

export {
  taskNameSchema,
  taskTypeSchema,
  runTaskSchema,
  recordTaskSchema,
  type RunTaskInput,
  type RecordTaskInput,
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
