/**
 * Failures panel: task failures grouped by task, filterable by error type,
 * with a details dialog that produces a repair prompt.
 */

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { FailureRecord } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useFailureFilters } from '@/hooks/useFailureFilters';
import { cn } from '@/lib/utils';
import { FilterTabs } from './warnings/components/FilterTabs';
import { FailureCard } from './warnings/components/FailureCard';
import { FailureDetailsDialog } from './warnings/components/FailureDetailsDialog';

export interface WarningsPanelProps {
  failures: FailureRecord[];
  onClearFailures: () => void;
  onDismissFailure: (id: string) => void;
  className?: string;
}

export function WarningsPanel({
  failures,
  onClearFailures,
  onDismissFailure,
  className,
}: WarningsPanelProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<FailureRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { filters, setErrorType, groupedFailures, filteredCount, uniqueTaskCount } = useFailureFilters(failures);
  const groups = Object.entries(groupedFailures);
  const affectedTasks = new Set(failures.map((f) => f.taskName)).size;

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="flex-wrap">
          <CardTitle>
            {filteredCount > 0 ? (
              <>
                <span className="text-destructive">{filteredCount}</span>
                <span className="font-normal text-muted-foreground">
                  across {uniqueTaskCount} task{uniqueTaskCount !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              'All clear'
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <FilterTabs
              activeFilter={filters.errorType}
              onFilterChange={setErrorType}
              failureCount={failures.length}
            />
            {failures.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>

        {groups.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={failures.length === 0 ? 'No failures recorded' : 'No failures of this type'}
            description={failures.length === 0 ? 'When a task fails, the error and its diagnostics show up here.' : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {groups.map(([taskName, taskFailures]) => (
              <FailureCard
                key={taskName}
                taskName={taskName}
                failures={taskFailures}
                isExpanded={expandedTask === taskName}
                onToggle={() => setExpandedTask(expandedTask === taskName ? null : taskName)}
                onViewDetails={setSelectedFailure}
              />
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear all failures?"
        description={`This permanently removes ${failures.length} failure${failures.length !== 1 ? 's' : ''} across ${affectedTasks} task${affectedTasks !== 1 ? 's' : ''}.`}
        confirmLabel="Clear all"
        onConfirm={onClearFailures}
      />

      <FailureDetailsDialog
        failure={selectedFailure}
        onClose={() => setSelectedFailure(null)}
        onDismiss={onDismissFailure}
      />
    </>
  );
}
