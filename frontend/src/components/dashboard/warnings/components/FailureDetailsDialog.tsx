/**
 * Failure Details Dialog Component for Warnings Panel
 *
 * Modal dialog displaying detailed information about a failure.
 * Extracted from WarningsPanel.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.2.3
 */

import { type LucideIcon, X, MapPin, AlertCircle, Timer, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FailureRecord } from '@/types';
import { useFailureStyles } from '@/hooks/useFailureStyles';
import { toTitleCase } from '@/utils/formatters';
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

export interface FailureDetailsDialogProps {
  /** Failure record to display details for */
  failure: FailureRecord | null;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when failure is dismissed */
  onDismiss: (id: string) => void;
}

/**
 * Context value display component.
 */
interface ContextValueProps {
  label: string;
  value: unknown;
}

function ContextValue({ label, value }: ContextValueProps) {
  const displayValue = typeof value === 'object'
    ? JSON.stringify(value, null, 2) ?? 'null'
    : String(value);

  return (
    <div className="p-3 bg-slate-950/50 rounded-lg">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-300 font-mono break-all">
        {displayValue}
      </p>
    </div>
  );
}

/**
 * Failure details dialog modal component.
 * Shows full context, timestamps, and occurrence count for a failure.
 *
 * @example
 * <FailureDetailsDialog
 *   failure={selectedFailure}
 *   onClose={() => setSelectedFailure(null)}
 *   onDismiss={(id) => dismissFailure(id)}
 * />
 */
export function FailureDetailsDialog({
  failure,
  onClose,
  onDismiss,
}: FailureDetailsDialogProps) {
  const styles = useFailureStyles();

  return (
    <AnimatePresence>
      {failure && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
          >
            {/* Gradient background effect */}
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${styles.getGradient(failure.errorType)} rounded-2xl blur opacity-30`} />

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border ${styles.getBorder(failure.errorType)}`}>
                    <div className={styles.getColor(failure.errorType)}>
                      {(() => {
                        const Icon = ERROR_ICONS[failure.errorType] || Bug;
                        return <Icon className="w-6 h-6" />;
                      })()}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {failure.taskName}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {toTitleCase(failure.errorType)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details content */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {/* Error message */}
                {typeof failure.context?.errorMessage === 'string' && (
                  <ContextValue
                    label="Error Message"
                    value={failure.context.errorMessage}
                  />
                )}

                {/* Other context values */}
                {Object.entries(failure.context).map(([key, value]) => {
                  if (key === 'errorMessage') return null;
                  return (
                    <ContextValue
                      key={key}
                      label={key.replace(/([A-Z])/g, ' $1').trim()}
                      value={value}
                    />
                  );
                })}

                {/* First occurred */}
                <div className="p-3 bg-slate-950/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">First Occurred</p>
                  <p className="text-sm text-slate-300">
                    {new Date(failure.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Occurrences */}
                <div className="p-3 bg-slate-950/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Occurrences</p>
                  <p className="text-sm text-slate-300">
                    {failure.count} time{failure.count !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Last seen */}
                <div className="p-3 bg-slate-950/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Last Seen</p>
                  <p className="text-sm text-slate-300">
                    {new Date(failure.lastSeen).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    onDismiss(failure.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
