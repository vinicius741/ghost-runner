/**
 * Error-type filter for the failures list.
 */

import type { FailureRecord } from '@/types';
import { SegmentedControl } from '@/components/common/SegmentedControl';

export type FilterValue = 'all' | FailureRecord['errorType'];

export interface FilterOption {
  value: FilterValue;
  label: string;
}

export interface FilterTabsProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
  /** Number of failures; the filter is hidden when there are none. */
  failureCount: number;
  filterOptions?: FilterOption[];
}

const DEFAULT_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'element_not_found', label: 'Element' },
  { value: 'navigation_failure', label: 'Navigation' },
  { value: 'timeout', label: 'Timeout' },
];

export function FilterTabs({
  activeFilter,
  onFilterChange,
  failureCount,
  filterOptions = DEFAULT_FILTER_OPTIONS,
}: FilterTabsProps) {
  if (failureCount === 0) {
    return null;
  }

  return (
    <SegmentedControl
      size="sm"
      ariaLabel="Filter failures by type"
      value={activeFilter}
      onChange={onFilterChange}
      options={filterOptions}
    />
  );
}
