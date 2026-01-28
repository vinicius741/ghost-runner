/**
 * Failure Styles Hook for Ghost Runner Frontend
 *
 * This hook provides memoized style calculations for failure cards
 * based on error type. Prevents unnecessary recalculations and
 * ensures consistent styling across components.
 *
 * Related: Development Execution Plan Task 1.3.5
 */

import { useCallback } from 'react';
import type { Failure } from '@/types';
import {
  getErrorBorder,
  getErrorColor,
  getErrorGradient,
  getErrorIcon,
  getErrorBadgeBg,
  getErrorBadgeText,
  getErrorHoverColor,
  type ErrorType,
} from '@/utils/styleHelpers';

/**
 * Style configuration for a failure card or indicator.
 * All classes are Tailwind CSS strings.
 */
export interface FailureStyleConfig {
  /** Border color class */
  borderClass: string;
  /** Icon color class */
  iconClass: string;
  /** Background gradient class */
  gradientClass: string;
  /** Lucide icon component name */
  iconName: string;
  /** Badge background class */
  badgeBgClass: string;
  /** Badge text color class */
  badgeTextClass: string;
  /** Hover color class */
  hoverClass: string;
}

/**
 * Enhanced style configuration with human-readable labels.
 */
export interface FailureStyleConfigWithLabel extends FailureStyleConfig {
  /** Human-readable error type label */
  label: string;
  /** Error type value */
  errorType: ErrorType;
}

/**
 * Return type for the useFailureStyles hook.
 */
export interface UseFailureStylesResult {
  /** Get styles for a specific failure type */
  getStyles: (errorType: ErrorType) => FailureStyleConfig;
  /** Get enhanced styles with labels for a specific failure type */
  getStylesWithLabel: (errorType: ErrorType) => FailureStyleConfigWithLabel;
  /** Get color class for a specific failure type */
  getColor: (errorType: ErrorType) => string;
  /** Get icon name for a specific failure type */
  getIconName: (errorType: ErrorType) => string;
  /** Get border class for a specific failure type */
  getBorder: (errorType: ErrorType) => string;
  /** Get gradient class for a specific failure type */
  getGradient: (errorType: ErrorType) => string;
  /** Get style configuration for a failure record */
  getFailureStyles: (failure: Failure) => FailureStyleConfig;
  /** Get style configuration for a failure record with label */
  getFailureStylesWithLabel: (failure: Failure) => FailureStyleConfigWithLabel;
}

/**
 * Human-readable label for an error type.
 */
function getErrorLabel(errorType: ErrorType): string {
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
 * Build style configuration for an error type.
 */
function buildStyleConfig(errorType: ErrorType): FailureStyleConfig {
  return {
    borderClass: getErrorBorder(errorType),
    iconClass: getErrorColor(errorType),
    gradientClass: getErrorGradient(errorType),
    iconName: getErrorIcon(errorType),
    badgeBgClass: getErrorBadgeBg(errorType),
    badgeTextClass: getErrorBadgeText(errorType),
    hoverClass: getErrorHoverColor(errorType),
  };
}

/**
 * Cache of style configurations for each error type.
 * Computed once and reused to avoid recalculation.
 */
const STYLE_CACHE: Record<ErrorType, FailureStyleConfig> = {
  element_not_found: buildStyleConfig('element_not_found'),
  navigation_failure: buildStyleConfig('navigation_failure'),
  timeout: buildStyleConfig('timeout'),
  unknown: buildStyleConfig('unknown'),
};

/**
 * Hook for getting failure styles with memoization.
 * Provides efficient style lookups for failure cards and indicators.
 *
 * @returns Object with style getter functions
 *
 * @example
 * const { getStyles, getColor, getFailureStyles } = useFailureStyles();
 *
 * // Get all styles for an error type
 * const styles = getStyles('element_not_found');
 * // styles.borderClass => 'border-amber-500/30'
 *
 * // Get just the color
 * const color = getColor('timeout');
 * // color => 'text-orange-400'
 *
 * // Get styles for a specific failure record
 * const failureStyles = getFailureStyles(failureRecord);
 */
export function useFailureStyles(): UseFailureStylesResult {
  /**
   * Get complete style configuration for an error type.
   * Results are memoized in a cache for performance.
   */
  const getStyles = useCallback((errorType: ErrorType): FailureStyleConfig => {
    return STYLE_CACHE[errorType] || STYLE_CACHE.unknown;
  }, []);

  /**
   * Get style configuration with human-readable label.
   */
  const getStylesWithLabel = useCallback(
    (errorType: ErrorType): FailureStyleConfigWithLabel => {
      const baseStyles = getStyles(errorType);
      return {
        ...baseStyles,
        label: getErrorLabel(errorType),
        errorType,
      };
    },
    [getStyles]
  );

  /**
   * Get the color class for an error type.
   */
  const getColor = useCallback((errorType: ErrorType): string => {
    return getErrorColor(errorType);
  }, []);

  /**
   * Get the icon name for an error type.
   */
  const getIconName = useCallback((errorType: ErrorType): string => {
    return getErrorIcon(errorType);
  }, []);

  /**
   * Get the border class for an error type.
   */
  const getBorder = useCallback((errorType: ErrorType): string => {
    return getErrorBorder(errorType);
  }, []);

  /**
   * Get the gradient class for an error type.
   */
  const getGradient = useCallback((errorType: ErrorType): string => {
    return getErrorGradient(errorType);
  }, []);

  /**
   * Get style configuration for a failure record.
   * Extracts error type from the record and returns styles.
   */
  const getFailureStyles = useCallback(
    (failure: Failure): FailureStyleConfig => {
      return getStyles(failure.errorType);
    },
    [getStyles]
  );

  /**
   * Get style configuration with label for a failure record.
   */
  const getFailureStylesWithLabel = useCallback(
    (failure: Failure): FailureStyleConfigWithLabel => {
      return getStylesWithLabel(failure.errorType);
    },
    [getStylesWithLabel]
  );

  return {
    getStyles,
    getStylesWithLabel,
    getColor,
    getIconName,
    getBorder,
    getGradient,
    getFailureStyles,
    getFailureStylesWithLabel,
  };
}

/**
 * Hook for getting styles with animation variants.
 * Provides Framer Motion variant objects for consistent animations.
 *
 * @returns Object with animation variants
 *
 * @example
 * const { getCardVariants, getIconVariants } = useFailureAnimationVariants();
 */
export function useFailureAnimationVariants() {
  /**
   * Get card animation variants.
   */
  const getCardVariants = useCallback((): Record<string, unknown> => {
    return {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 10 },
    };
  }, []);

  /**
   * Get icon animation variants.
   */
  const getIconVariants = useCallback((): Record<string, unknown> => {
    return {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      hover: { scale: 1.1 },
      transition: { duration: 0.2 },
    };
  }, []);

  return {
    getCardVariants,
    getIconVariants,
  };
}
