/**
 * Shared Types Package
 *
 * This package contains all type definitions shared between
 * backend and frontend to prevent type drift and duplication.
 *
 * Usage:
 * ```typescript
 * // Backend
 * import { ScheduleItem, FailureRecord } from '../../shared/types';
 *
 * // Frontend
 * import { Task, LogEntry } from '../../../shared/types';
 * ```
 *
 * @module shared/types
 */

// Schedule types
export type { ScheduleItem, NextTask, ScheduleUpdatePayload } from './schedule';

// Task types
export type {
  Task,
  TaskType,
  LogEntry,
  TaskStatus,
  TaskStatusData,
  ParsedTaskStatus,
  InfoGatheringDataType,
  InfoGatheringMetadata,
  TaskStartedPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
} from './task';
export { isValidTaskStatus, isInfoGatheringData } from './task';

// Failure types
export type { FailureRecord, FailureErrorType, FailureRecordedPayload } from './failure';

// Settings types
export type { Settings, GeolocationSettings } from './settings';
export { DEFAULT_LOCATION } from './settings';

// Info-gathering types
export type { InfoGatheringResult, InfoDataUpdatedPayload } from './infoGathering';

// Socket types
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './socket';
