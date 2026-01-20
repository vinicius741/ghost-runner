import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronRight,
  MapPin,
  Timer,
  Bug,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FailureRecord } from '@/types';

interface WarningsPanelProps {
  failures: FailureRecord[];
  onClearFailures: () => void;
  onDismissFailure: (id: string) => void;
}

// Helper function for error border color
function getErrorBorder(errorType: FailureRecord['errorType']): string {
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
 * Warnings Panel - displays task failures grouped by task name.
 * Features:
 * - Grouped failures by task with occurrence counts
 * - Filter by error type
 * - Details dialog with full error context
 * - Real-time updates via props
 */
export function WarningsPanel({ failures, onClearFailures, onDismissFailure }: WarningsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'element_not_found' | 'navigation_failure' | 'timeout'>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<FailureRecord | null>(null);

  // Group failures by task name
  const groupedFailures = failures.reduce((acc, failure) => {
    if (!acc[failure.taskName]) {
      acc[failure.taskName] = [];
    }
    acc[failure.taskName].push(failure);
    return acc;
  }, {} as Record<string, FailureRecord[]>);

  // Filter failures based on selected filter
  const filteredFailures = Object.entries(groupedFailures).filter(([, failures]) => {
    if (filter === 'all') return true;
    return failures.some(f => f.errorType === filter);
  });

  const totalFailures = failures.length;
  const uniqueTasks = Object.keys(groupedFailures).length;

  // Get icon for error type
  const getErrorIcon = (errorType: FailureRecord['errorType']) => {
    switch (errorType) {
      case 'element_not_found':
        return <MapPin className="w-4 h-4" />;
      case 'navigation_failure':
        return <AlertCircle className="w-4 h-4" />;
      case 'timeout':
        return <Timer className="w-4 h-4" />;
      default:
        return <Bug className="w-4 h-4" />;
    }
  };

  // Get color class for error type
  const getErrorColor = (errorType: FailureRecord['errorType']) => {
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
  };

  // Get background gradient for error type
  const getErrorGradient = (errorType: FailureRecord['errorType']) => {
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
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return date.toLocaleDateString();
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="card-premium flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/50 bg-slate-900/20">
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Task Failures
            {totalFailures > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                {totalFailures}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400">
                {uniqueTasks} task{uniqueTasks !== 1 ? 's' : ''}
              </span>
            </div>
            {totalFailures > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFailures}
                className="h-8 text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-xs">Clear</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 bg-black/20">
          {/* Filter tabs */}
          {totalFailures > 0 && (
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800/50">
              {[
                { value: 'all' as const, label: 'All' },
                { value: 'element_not_found' as const, label: 'Element' },
                { value: 'navigation_failure' as const, label: 'Navigation' },
                { value: 'timeout' as const, label: 'Timeout' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[280px] w-full">
            <div className="p-4 space-y-3">
              {filteredFailures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <CheckCircle className="w-12 h-12 mb-3 text-emerald-500/20" />
                  <p className="text-sm font-medium">No failures recorded</p>
                  <p className="text-xs mt-1">Task failures will appear here</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredFailures.map(([taskName, taskFailures]) => {
                    const latestFailure = taskFailures.sort((a, b) =>
                      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
                    )[0];
                    const isExpanded = expandedTask === taskName;

                    return (
                      <motion.div
                        key={taskName}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group"
                      >
                        {/* Task header */}
                        <div
                          onClick={() => setExpandedTask(isExpanded ? null : taskName)}
                          className="relative flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-900/50 hover:border-slate-700/50 transition-all duration-300"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600/20 to-orange-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                          <div className="relative flex items-center gap-3 flex-1 min-w-0">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border ${getErrorBorder(latestFailure.errorType)}`}>
                              <div className={getErrorColor(latestFailure.errorType)}>
                                {getErrorIcon(latestFailure.errorType)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-slate-200 font-semibold text-sm truncate">
                                  {taskName}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                                  {taskFailures.reduce((sum, f) => sum + f.count, 0)}
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
                                {taskFailures.map((failure) => (
                                  <div
                                    key={failure.id}
                                    className="p-3 bg-slate-950/30 rounded-lg border border-slate-800/50"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-400 mb-1">
                                          {failure.errorType.replace(/_/g, ' ')}
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
                                          setSelectedFailure(failure);
                                        }}
                                        className="flex-shrink-0 px-2 py-1 rounded bg-slate-800/50 text-slate-400 text-xs hover:bg-slate-700/50 hover:text-slate-300 transition-colors"
                                      >
                                        Details
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details dialog */}
      <AnimatePresence>
        {selectedFailure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFailure(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            >
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${getErrorGradient(selectedFailure.errorType)} rounded-2xl blur opacity-30`} />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border ${getErrorBorder(selectedFailure.errorType)}`}>
                      <div className={getErrorColor(selectedFailure.errorType)}>
                        {getErrorIcon(selectedFailure.errorType)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {selectedFailure.taskName}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {selectedFailure.errorType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFailure(null)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  <div className="p-3 bg-slate-950/50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Error Message</p>
                    <p className="text-sm text-slate-300">{selectedFailure.context?.errorMessage as string}</p>
                  </div>

                  {Object.entries(selectedFailure.context).map(([key, value]) => {
                    if (key === 'errorMessage') return null;
                    return (
                      <div key={key} className="p-3 bg-slate-950/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-sm text-slate-300 font-mono break-all">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    );
                  })}

                  <div className="p-3 bg-slate-950/50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">First Occurred</p>
                    <p className="text-sm text-slate-300">{new Date(selectedFailure.timestamp).toLocaleString()}</p>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Occurrences</p>
                    <p className="text-sm text-slate-300">{selectedFailure.count} time{selectedFailure.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      onDismissFailure(selectedFailure.id);
                      setSelectedFailure(null);
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
    </motion.div>
  );
}
