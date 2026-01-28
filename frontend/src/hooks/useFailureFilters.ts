/**
 * Failure Filters Hook for Ghost Runner Frontend
 *
 * This hook manages filter state for the failures panel with memoized
 * filtered results for optimal performance.
 * Extracted from WarningsPanel.tsx for reusability.
 *
 * Related: Development Execution Plan Task 1.3.4
 */

import { useState, useMemo, useCallback } from 'react';
import type { FailureRecord } from '@/types';

/**
 * Filter options for the failures panel.
 */
export interface FailureFilters {
  /** Filter by error type */
  errorType: FailureRecord['errorType'] | 'all';
  /** Filter by task name (partial match) */
  taskName?: string;
  /** Show only active (non-dismissed) failures */
  activeOnly: boolean;
  /** Search query for context/message */
  searchQuery?: string;
}

/**
 * Default filter values.
 */
const DEFAULT_FILTERS: FailureFilters = {
  errorType: 'all',
  taskName: undefined,
  activeOnly: false,
  searchQuery: undefined,
};

/**
 * Return type for the useFailureFilters hook.
 */
export interface UseFailureFiltersResult {
  /** Current filter settings */
  filters: FailureFilters;
  /** Update filter settings */
  setFilters: (filters: Partial<FailureFilters>) => void;
  /** Set error type filter */
  setErrorType: (errorType: FailureFilters['errorType']) => void;
  /** Set task name filter */
  setTaskName: (taskName: string | undefined) => void;
  /** Toggle active-only filter */
  toggleActiveOnly: () => void;
  /** Set search query filter */
  setSearchQuery: (query: string | undefined) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Filtered failures array (memoized) */
  filteredFailures: FailureRecord[];
  /** Grouped failures by task name (memoized) */
  groupedFailures: Record<string, FailureRecord[]>;
  /** Count of failures matching current filters (memoized) */
  filteredCount: number;
  /** Count of unique tasks with failures (memoized) */
  uniqueTaskCount: number;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
}

/**
 * Hook for filtering failures with memoized results.
 *
 * @param failures - Array of failure records to filter
 * @returns Filter state and filtered results
 *
 * @example
 * const {
 *   filters,
 *   setFilters,
 *   setErrorType,
 *   filteredFailures,
 *   filteredCount
 * } = useFailureFilters(failures);
 *
 * // Filter by error type
 * setErrorType('element_not_found');
 *
 * // Update multiple filters
 * setFilters({ errorType: 'timeout', activeOnly: true });
 */
export function useFailureFilters(
  failures: FailureRecord[]
): UseFailureFiltersResult {
  const [filters, setFiltersState] = useState<FailureFilters>(DEFAULT_FILTERS);

  /**
   * Update filter settings with partial updates.
   */
  const setFilters = useCallback((newFilters: Partial<FailureFilters>): void => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Set error type filter.
   */
  const setErrorType = useCallback((errorType: FailureFilters['errorType']): void => {
    setFiltersState((prev) => ({ ...prev, errorType }));
  }, []);

  /**
   * Set task name filter.
   */
  const setTaskName = useCallback((taskName: string | undefined): void => {
    setFiltersState((prev) => ({ ...prev, taskName }));
  }, []);

  /**
   * Toggle active-only filter.
   */
  const toggleActiveOnly = useCallback((): void => {
    setFiltersState((prev) => ({ ...prev, activeOnly: !prev.activeOnly }));
  }, []);

  /**
   * Set search query filter.
   */
  const setSearchQuery = useCallback((searchQuery: string | undefined): void => {
    setFiltersState((prev) => ({ ...prev, searchQuery }));
  }, []);

  /**
   * Reset all filters to defaults.
   */
  const resetFilters = useCallback((): void => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  /**
   * Filter failures based on current filter settings.
   * Memoized for performance - only recalculates when filters or failures change.
   */
  const filteredFailures = useMemo((): FailureRecord[] => {
    return failures.filter((failure) => {
      // Filter by error type
      if (filters.errorType !== 'all' && failure.errorType !== filters.errorType) {
        return false;
      }

      // Filter by task name (partial match, case-insensitive)
      if (
        filters.taskName &&
        !failure.taskName.toLowerCase().includes(filters.taskName.toLowerCase())
      ) {
        return false;
      }

      // Filter active only (non-dismissed)
      if (filters.activeOnly && failure.dismissed) {
        return false;
      }

      // Filter by search query (search in context and task name)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const taskNameMatch = failure.taskName.toLowerCase().includes(query);
        const errorMessageMatch = String(
          failure.context?.errorMessage || ''
        ).toLowerCase().includes(query);
        const urlMatch = String(failure.context?.url || '').toLowerCase().includes(query);
        const selectorMatch = String(
          failure.context?.selector || ''
        ).toLowerCase().includes(query);

        if (!taskNameMatch && !errorMessageMatch && !urlMatch && !selectorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [failures, filters]);

  /**
   * Group filtered failures by task name.
   * Memoized for performance.
   */
  const groupedFailures = useMemo((): Record<string, FailureRecord[]> => {
    return filteredFailures.reduce((acc, failure) => {
      if (!acc[failure.taskName]) {
        acc[failure.taskName] = [];
      }
      acc[failure.taskName].push(failure);
      return acc;
    }, {} as Record<string, FailureRecord[]>);
  }, [filteredFailures]);

  /**
   * Count of failures matching current filters.
   */
  const filteredCount = useMemo(() => filteredFailures.length, [filteredFailures]);

  /**
   * Count of unique tasks with failures.
   */
  const uniqueTaskCount = useMemo(() => Object.keys(groupedFailures).length, [groupedFailures]);

  /**
   * Whether any non-default filters are active.
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.errorType !== 'all' ||
      !!filters.taskName ||
      filters.activeOnly ||
      !!filters.searchQuery
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    setErrorType,
    setTaskName,
    toggleActiveOnly,
    setSearchQuery,
    resetFilters,
    filteredFailures,
    groupedFailures,
    filteredCount,
    uniqueTaskCount,
    hasActiveFilters,
  };
}

/**
 * Hook for filtering and sorting grouped failures.
 * Extends useFailureFilters with sorting capabilities.
 *
 * @param failures - Array of failure records to filter
 * @returns Filter state and sorted grouped results
 *
 * @example
 * const { groupedFailures, setSortOrder } = useFailureFiltersWithSort(failures);
 */
export function useFailureFiltersWithSort(failures: FailureRecord[]) {
  const baseFilters = useFailureFilters(failures);

  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'count'>('recent');

  /**
   * Sort grouped failures by specified criteria.
   */
  const sortedGroupedFailures = useMemo(() => {
    const entries = Object.entries(baseFilters.groupedFailures);

    switch (sortOrder) {
      case 'recent':
        return entries.sort(([, a], [, b]) => {
          const aLatest = Math.max(...a.map((f) => new Date(f.lastSeen).getTime()));
          const bLatest = Math.max(...b.map((f) => new Date(f.lastSeen).getTime()));
          return bLatest - aLatest;
        });
      case 'oldest':
        return entries.sort(([, a], [, b]) => {
          const aOldest = Math.min(...a.map((f) => new Date(f.timestamp).getTime()));
          const bOldest = Math.min(...b.map((f) => new Date(f.timestamp).getTime()));
          return aOldest - bOldest;
        });
      case 'count':
        return entries.sort(([, a], [, b]) => {
          const aCount = a.reduce((sum, f) => sum + f.count, 0);
          const bCount = b.reduce((sum, f) => sum + f.count, 0);
          return bCount - aCount;
        });
      default:
        return entries;
    }
  }, [baseFilters.groupedFailures, sortOrder]);

  return {
    ...baseFilters,
    sortOrder,
    setSortOrder,
    sortedGroupedFailures,
  };
}
