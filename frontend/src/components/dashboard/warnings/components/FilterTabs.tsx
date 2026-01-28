/**
 * Filter Tabs Component for Warnings Panel
 *
 * Provides tab-based filtering for failure records by error type.
 * Extracted from WarningsPanel.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.2.4
 */

import type { FailureRecord } from '@/types';

export type FilterValue = 'all' | FailureRecord['errorType'];

export interface FilterOption {
  value: FilterValue;
  label: string;
}

export interface FilterTabsProps {
  /** Current active filter */
  activeFilter: FilterValue;
  /** Callback when filter is changed */
  onFilterChange: (filter: FilterValue) => void;
  /** Number of failures (to show/hide tabs) */
  failureCount: number;
  /** Custom filter options */
  filterOptions?: FilterOption[];
}

/**
 * Default filter options for the warnings panel.
 */
const DEFAULT_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'element_not_found', label: 'Element' },
  { value: 'navigation_failure', label: 'Navigation' },
  { value: 'timeout', label: 'Timeout' },
];

/**
 * Filter tabs component for filtering failures by error type.
 *
 * @example
 * <FilterTabs
 *   activeFilter="all"
 *   onFilterChange={setFilter}
 *   failureCount={failures.length}
 * />
 */
export function FilterTabs({
  activeFilter,
  onFilterChange,
  failureCount,
  filterOptions = DEFAULT_FILTER_OPTIONS,
}: FilterTabsProps) {
  // Don't render tabs if there are no failures
  if (failureCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800/50">
      {filterOptions.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          aria-pressed={activeFilter === filter.value}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeFilter === filter.value
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
