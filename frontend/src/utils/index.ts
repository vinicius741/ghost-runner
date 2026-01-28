/**
 * Utils Index - Centralized exports for all utility functions
 *
 * This file re-exports all utility functions for convenient importing.
 *
 * @example
 * import { formatTimestamp, getErrorColor } from '@/utils';
 */

export {
  formatTimestamp,
  formatDuration,
  formatFileSize,
  formatNumber,
  truncateText,
  capitalize,
  toTitleCase,
} from './formatters';
export type { TimestampFormat } from './formatters';

export {
  getErrorBorder,
  getErrorColor,
  getErrorGradient,
  getErrorIcon,
  getErrorBadgeBg,
  getErrorBadgeText,
  getErrorHoverColor,
  getErrorStyleConfig,
  getErrorLabel,
  isKnownErrorType,
} from './styleHelpers';
export type { ErrorType, ErrorStyleConfig } from './styleHelpers';
