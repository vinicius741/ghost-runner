/**
 * Style Helper Utilities for Ghost Runner Frontend
 *
 * This file contains pure functions for getting error type colors, icons,
 * and other style-related helpers.
 *
 * Related: Development Execution Plan Task 1.2.2
 */

import type { FailureRecord } from '@/types';

/**
 * Error type supported by the failure tracking system.
 */
export type ErrorType = FailureRecord['errorType'];

/**
 * Get the border color class for a specific error type.
 * Used for failure card borders.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS border color class name
 *
 * @example
 * getErrorBorder('element_not_found') // 'border-amber-500/30'
 */
export function getErrorBorder(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'border-amber-500/30';
    case 'navigation_failure':
      return 'border-red-500/30';
    case 'timeout':
      return 'border-orange-500/30';
    default:
      return 'border-slate-500/30';
  }
}

/**
 * Get the text color class for a specific error type.
 * Used for icons and text highlighting.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS text color class name
 *
 * @example
 * getErrorColor('element_not_found') // 'text-amber-400'
 */
export function getErrorColor(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'text-amber-400';
    case 'navigation_failure':
      return 'text-red-400';
    case 'timeout':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
}

/**
 * Get the background gradient class for a specific error type.
 * Used for failure card backgrounds and blur effects.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS gradient class name
 *
 * @example
 * getErrorGradient('element_not_found') // 'from-amber-600 to-orange-500'
 */
export function getErrorGradient(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'from-amber-600 to-orange-500';
    case 'navigation_failure':
      return 'from-red-600 to-rose-500';
    case 'timeout':
      return 'from-orange-600 to-amber-500';
    default:
      return 'from-slate-600 to-slate-500';
  }
}

/**
 * Get the Lucide icon name for a specific error type.
 * Returns the icon component name as a string for dynamic rendering.
 *
 * @param errorType - The type of error
 * @returns Lucide icon component name
 *
 * @example
 * getErrorIcon('element_not_found') // 'MapPin'
 */
export function getErrorIcon(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'MapPin';
    case 'navigation_failure':
      return 'AlertCircle';
    case 'timeout':
      return 'Timer';
    default:
      return 'Bug';
  }
}

/**
 * Get the background color class for badges/indicators.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS background color class name
 *
 * @example
 * getErrorBadgeBg('element_not_found') // 'bg-amber-500/20'
 */
export function getErrorBadgeBg(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'bg-amber-500/20';
    case 'navigation_failure':
      return 'bg-red-500/20';
    case 'timeout':
      return 'bg-orange-500/20';
    default:
      return 'bg-slate-500/20';
  }
}

/**
 * Get the badge text color class.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS text color class name
 *
 * @example
 * getErrorBadgeText('element_not_found') // 'text-amber-400'
 */
export function getErrorBadgeText(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'text-amber-400';
    case 'navigation_failure':
      return 'text-red-400';
    case 'timeout':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
}

/**
 * Get the hover color class for buttons/interactive elements.
 *
 * @param errorType - The type of error
 * @returns Tailwind CSS hover color class name
 *
 * @example
 * getErrorHoverColor('element_not_found') // 'hover:text-amber-300'
 */
export function getErrorHoverColor(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'hover:text-amber-300';
    case 'navigation_failure':
      return 'hover:text-red-300';
    case 'timeout':
      return 'hover:text-orange-300';
    default:
      return 'hover:text-slate-300';
  }
}

/**
 * Get complete style configuration for an error type.
 * Returns all related style classes in a single object.
 *
 * @param errorType - The type of error
 * @returns Object containing all style classes for this error type
 *
 * @example
 * getErrorStyleConfig('element_not_found')
 * // { border: 'border-amber-500/30', color: 'text-amber-400', ... }
 */
export function getErrorStyleConfig(errorType: ErrorType): ErrorStyleConfig {
  return {
    border: getErrorBorder(errorType),
    color: getErrorColor(errorType),
    gradient: getErrorGradient(errorType),
    icon: getErrorIcon(errorType),
    badgeBg: getErrorBadgeBg(errorType),
    badgeText: getErrorBadgeText(errorType),
    hoverColor: getErrorHoverColor(errorType),
  };
}

/**
 * Complete style configuration for an error type.
 */
export interface ErrorStyleConfig {
  /** Border color class */
  border: string;
  /** Text color class */
  color: string;
  /** Background gradient class */
  gradient: string;
  /** Lucide icon name */
  icon: string;
  /** Badge background class */
  badgeBg: string;
  /** Badge text color class */
  badgeText: string;
  /** Hover color class */
  hoverColor: string;
}

/**
 * Convert error type to human-readable label.
 *
 * @param errorType - The type of error
 * @returns Human-readable error label
 *
 * @example
 * getErrorLabel('element_not_found') // 'Element Not Found'
 */
export function getErrorLabel(errorType: ErrorType): string {
  switch (errorType) {
    case 'element_not_found':
      return 'Element Not Found';
    case 'navigation_failure':
      return 'Navigation Failure';
    case 'timeout':
      return 'Timeout';
    default:
      return 'Unknown Error';
  }
}

/**
 * Check if an error type is a known (non-unknown) error type.
 *
 * @param errorType - The error type to check
 * @returns True if the error type is known
 */
export function isKnownErrorType(errorType: ErrorType): boolean {
  return errorType !== 'unknown';
}
