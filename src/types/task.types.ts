/**
 * Task-related type definitions for the Ghost Runner backend.
 *
 * This module re-exports types from the shared types package and adds
 * any backend-specific extensions.
 *
 * @module types/task.types
 */

// Re-export all types from shared types
export type {
  TaskStatus,
  TaskStatusData,
  ParsedTaskStatus,
  InfoGatheringDataType,
  InfoGatheringMetadata,
} from '../../shared/types';

export { isValidTaskStatus, isInfoGatheringData } from '../../shared/types';
