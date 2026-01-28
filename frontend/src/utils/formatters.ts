/**
 * Formatter Utilities for Ghost Runner Frontend
 *
 * This file contains pure functions for formatting timestamps and durations
 * for display in the dashboard.
 *
 * Related: Development Execution Plan Task 1.2.1
 */

/**
 * Format specifier for timestamp display.
 */
export type TimestampFormat = 'full' | 'time' | 'date' | 'relative';

/**
 * Format a timestamp for display in the dashboard.
 * Extracted from WarningsPanel.tsx for reusability.
 *
 * @param timestamp - ISO timestamp string or Date object
 * @param format - Optional format specifier (default: 'relative')
 * @returns Formatted timestamp string
 *
 * @example
 * formatTimestamp('2024-01-15T10:30:00Z') // '2h ago'
 * formatTimestamp('2024-01-15T10:30:00Z', 'full') // '1/15/2024, 10:30:00 AM'
 */
export function formatTimestamp(
  timestamp: string | Date,
  format: TimestampFormat = 'relative'
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  switch (format) {
    case 'full':
      return date.toLocaleString();
    case 'time':
      return date.toLocaleTimeString();
    case 'date':
      return date.toLocaleDateString();
    case 'relative': {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        return date.toLocaleDateString();
      } else if (hours > 0) {
        return `${hours}h ago`;
      } else if (minutes > 0) {
        return `${minutes}m ago`;
      } else if (seconds > 0) {
        return `${seconds}s ago`;
      } else {
        return 'Just now';
      }
    }
    default:
      return date.toLocaleString();
  }
}

/**
 * Format a duration for display.
 *
 * @param milliseconds - Duration in milliseconds
 * @param precision - Number of decimal places for seconds (default: 1)
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(1500) // '1.5s'
 * formatDuration(500) // '500ms'
 * formatDuration(65000) // '1m 5s'
 */
export function formatDuration(milliseconds: number, precision: number = 1): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(precision)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds.toFixed(0)}s`
    : `${minutes}m`;
}

/**
 * Format a file size in bytes to human-readable format.
 *
 * @param bytes - Size in bytes
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1048576) // '1 MB'
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format a number with thousand separators.
 *
 * @param value - Number to format
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1000000) // '1,000,000'
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Truncate text to a maximum length with ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * truncateText('Very long text', 10) // 'Very long...'
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize the first letter of a string.
 *
 * @param text - Text to capitalize
 * @returns Capitalized text
 *
 * @example
 * capitalize('hello world') // 'Hello world'
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case.
 *
 * @param text - Text to convert
 * @returns Title case text
 *
 * @example
 * toTitleCase('hello_world') // 'Hello World'
 */
export function toTitleCase(text: string): string {
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
