/**
 * Failure Card Component for Warnings Panel
 *
 * Displays an individual failure record with expandable details.
 * Extracted from WarningsPanel.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.2.2
 */

import { type LucideIcon, MapPin, AlertCircle, Timer, Bug, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FailureRecord } from '@/types';
import { formatTimestamp, toTitleCase } from '@/utils/formatters';
import { useFailureStyles } from '@/hooks/useFailureStyles';
import { type ErrorType } from '@/utils/styleHelpers';

/**
 * Map of error type icons to Lucide components.
 */
const ERROR_ICONS: Record<ErrorType, LucideIcon> = {
  element_not_found: MapPin,
  navigation_failure: AlertCircle,
  timeout: Timer,
  unknown: Bug,
};

export interface FailureCardProps {
  /** Task name for this group of failures */
  taskName: string;
  /** Array of failures for this task */
  failures: FailureRecord[];
  /** Whether this card is expanded */
  isExpanded: boolean;
  /** Callback when card is clicked */
  onToggle: () => void;
  /** Callback when details button is clicked for a specific failure */
  onViewDetails: (failure: FailureRecord) => void;
}

/**
 * Icon component based on error type.
 */
function ErrorTypeIcon({ errorType, className }: { errorType: ErrorType; className?: string }) {
  const Icon = ERROR_ICONS[errorType] || Bug;
  return <Icon className={className} />;
}

/**
 * Individual failure item in the expanded view.
 */
interface FailureItemProps {
  failure: FailureRecord;
  onViewDetails: (failure: FailureRecord) => void;
}

function FailureItem({ failure, onViewDetails }: FailureItemProps) {
  return (
    <div className="p-3 bg-slate-950/30 rounded-lg border border-slate-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 mb-1">
            {toTitleCase(failure.errorType)}
          </p>
          {typeof failure.context?.selector === 'string' && (
            <p className="text-xs text-slate-500 font-mono truncate">
              Selector: {failure.context.selector}
            </p>
          )}
          {typeof failure.context?.url === 'string' && (
            <p className="text-xs text-slate-500 truncate">
              URL: {failure.context.url}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(failure);
          }}
          className="flex-shrink-0 px-2 py-1 rounded bg-slate-800/50 text-slate-400 text-xs hover:bg-slate-700/50 hover:text-slate-300 transition-colors"
        >
          Details
        </button>
      </div>
    </div>
  );
}

/**
 * Failure card component showing a task with its failures.
 * Displays task name, error type, occurrence count, and expandable details.
 *
 * @example
 * <FailureCard
 *   taskName="my_task"
 *   failures={[failure1, failure2]}
 *   isExpanded={expandedTask === 'my_task'}
 *   onToggle={() => setExpandedTask('my_task')}
 *   onViewDetails={setSelectedFailure}
 * />
 */
export function FailureCard({
  taskName,
  failures,
  isExpanded,
  onToggle,
  onViewDetails,
}: FailureCardProps) {
  const styles = useFailureStyles();

  // Get the latest failure for display
  const latestFailure = failures.sort((a, b) =>
    new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  )[0];

  const failureStyles = styles.getFailureRecordStyles(latestFailure);
  const totalCount = failures.reduce((sum, f) => sum + f.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group"
    >
      {/* Task header - clickable to expand */}
      <div
        onClick={onToggle}
        className="relative flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-900/50 hover:border-slate-700/50 transition-all duration-300"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600/20 to-orange-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div className="relative flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border ${failureStyles.borderClass}`}>
            <div className={failureStyles.iconClass}>
              <ErrorTypeIcon errorType={latestFailure.errorType} className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-slate-200 font-semibold text-sm truncate">
                {taskName}
              </h3>
              <span className={`px-1.5 py-0.5 rounded ${failureStyles.badgeBgClass} ${failureStyles.badgeTextClass} text-[10px] font-medium border ${failureStyles.borderClass.replace('/30', '/20')}`}>
                {totalCount}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(latestFailure.lastSeen)}
            </p>
          </div>
          <div className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-4 space-y-2 pl-4 border-l-2 border-slate-800">
              {failures.map((failure) => (
                <FailureItem
                  key={failure.id}
                  failure={failure}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
