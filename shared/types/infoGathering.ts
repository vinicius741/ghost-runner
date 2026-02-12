/**
 * Shared info-gathering type definitions.
 *
 * These types are used for tasks that collect and return data.
 *
 * @module shared/types/infoGathering
 */

import type { InfoGatheringDataType } from './task';

/**
 * Info gathering result stored in cache.
 */
export interface InfoGatheringResult {
  /** Name of the task that produced this result */
  taskName: string;
  /** Category for grouping results */
  category: string;
  /** Human-readable display name */
  displayName: string;
  /** The gathered data */
  data: unknown;
  /** ISO timestamp when data was last updated */
  lastUpdated: string;
  /** ISO timestamp when data expires (optional) */
  expiresAt?: string;
  /** Metadata about how to render the data */
  metadata: {
    /** Data type for rendering */
    dataType: InfoGatheringDataType;
    /** Optional renderer component name */
    renderedBy?: string;
  };
}

/**
 * Info data updated event payload.
 * Emitted via Socket.io when new info-gathering data is available.
 */
export interface InfoDataUpdatedPayload {
  result: InfoGatheringResult;
}
