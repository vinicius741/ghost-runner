/**
 * Warnings Panel - displays task failures grouped by task name.
 *
 * Features:
 * - Grouped failures by task with occurrence counts
 * - Filter by error type
 * - Details dialog with full error context
 * - Real-time updates via props
 *
 * Refactored in Phase 2 to use extracted components:
 * - FilterTabs for error type filtering
 * - FailureCard for individual task failure groups
 * - FailureDetailsDialog for detailed failure information
 *
 * Related: Development Execution Plan Task 2.2.5
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FailureRecord } from '@/types';
import { useFailureFilters } from '@/hooks/useFailureFilters';
import { FilterTabs } from './warnings/components/FilterTabs';
import { FailureCard } from './warnings/components/FailureCard';
import { FailureDetailsDialog } from './warnings/components/FailureDetailsDialog';

export interface WarningsPanelProps {
  failures: FailureRecord[];
  onClearFailures: () => void;
  onDismissFailure: (id: string) => void;
  onHeaderDoubleClick?: () => void;
}

/**
 * Empty state component when no failures are recorded.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
      <CheckCircle className="w-12 h-12 mb-3 text-emerald-500/20" />
      <p className="text-sm font-medium">No failures recorded</p>
      <p className="text-xs mt-1">Task failures will appear here</p>
    </div>
  );
}

/**
 * Main WarningsPanel component.
 */
export function WarningsPanel({
  failures,
  onClearFailures,
  onDismissFailure,
  onHeaderDoubleClick,
}: WarningsPanelProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<FailureRecord | null>(null);

  // Use the failure filters hook
  const {
    filters,
    setErrorType,
    groupedFailures,
    filteredCount,
    uniqueTaskCount,
  } = useFailureFilters(failures);

  // Convert grouped failures to array for rendering
  const filteredFailuresArray = Object.entries(groupedFailures);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="min-w-0 max-w-full"
    >
      <Card className={`card-premium flex flex-col overflow-hidden ${filteredCount > 0 ? 'border-red-500/40 shadow-red-950/30' : ''}`}>
        {/* Header */}
        <CardHeader className={`flex flex-col gap-3 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between ${filteredCount > 0 ? 'bg-red-950/25' : 'bg-muted/20'}`} onDoubleClick={onHeaderDoubleClick}>
          <CardTitle className="text-foreground flex min-w-0 flex-wrap items-center gap-2 font-medium tracking-tight">
            <AlertTriangle className={`w-4 h-4 ${filteredCount > 0 ? 'text-red-400 animate-pulse' : 'text-amber-500'}`} />
            Task Failures
            {filteredCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30 animate-pulse">
                {filteredCount} active
              </span>
            )}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground">
                {uniqueTaskCount} task{uniqueTaskCount !== 1 ? 's' : ''}
              </span>
            </div>
            {filteredCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFailures}
                className="h-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-xs">Clear</span>
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-0 bg-black/20">
          {/* Filter tabs */}
          <FilterTabs
            activeFilter={filters.errorType}
            onFilterChange={setErrorType}
            failureCount={filteredCount}
          />

          {/* Failures list */}
          <ScrollArea className="h-[280px] w-full min-w-0">
            <div className="p-4 space-y-3">
              {filteredFailuresArray.length === 0 ? (
                <EmptyState />
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredFailuresArray.map(([taskName, taskFailures]) => (
                    <FailureCard
                      key={taskName}
                      taskName={taskName}
                      failures={taskFailures}
                      isExpanded={expandedTask === taskName}
                      onToggle={() => setExpandedTask(expandedTask === taskName ? null : taskName)}
                      onViewDetails={(failure) => setSelectedFailure(failure)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details dialog */}
      <FailureDetailsDialog
        failure={selectedFailure}
        onClose={() => setSelectedFailure(null)}
        onDismiss={onDismissFailure}
      />
    </motion.div>
  );
}
