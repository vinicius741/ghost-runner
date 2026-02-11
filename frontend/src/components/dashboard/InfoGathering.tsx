import { useState, Component, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database,
  RefreshCw,
  ChevronRight,
  Clock,
  Trash2,
  Layers,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InfoGatheringResult } from '@/types';

// Constants
const SCROLL_AREA_HEIGHT = '280px';
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_MINUTE = 1000 * 60;

interface InfoGatheringProps {
  results: InfoGatheringResult[];
  onRefreshTask: (taskName: string) => void;
  onClearResult: (taskName: string) => void;
  onClearAll: () => void;
  onHeaderDoubleClick?: () => void;
  refreshingTasks?: string[];
}

/**
 * Error boundary wrapper component for catching rendering errors.
 */
class RenderErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Safe text renderer that handles potential rendering errors.
 */
function SafeTextRenderer({ value, className }: { value: unknown; className?: string }) {
  // Convert to string safely - no JSX in try/catch needed
  const text = String(value ?? 'N/A');
  return <span className={className}>{text}</span>;
}

/**
 * KeyValueDisplay - Renders key-value pairs in a grid layout
 */
function KeyValueDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  // Error state for this component
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="p-4 bg-destructive/30 rounded-lg border border-destructive/50 text-center text-destructive-foreground text-sm flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Error rendering key-value data
      </div>
    );
  }

  return (
    <RenderErrorBoundary
      fallback={
        <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Error rendering key-value data
        </div>
      }
      onError={() => setHasError(true)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="p-3 bg-card/50 rounded-lg border border-border/50">
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">
              {key}
            </div>
            <div className="text-sm font-semibold text-foreground break-all">
              <SafeTextRenderer value={value} />
            </div>
          </div>
        ))}
      </div>
    </RenderErrorBoundary>
  );
}

/**
 * TableDisplay - Renders tabular data
 */
function TableDisplay({ data }: { data: { headers: string[]; rows: unknown[][] } }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Error rendering table data
      </div>
    );
  }

  if (!data?.headers || !data?.rows || data.rows.length === 0) {
    return (
      <div className="p-4 bg-card/30 rounded-lg border border-border/50 text-center text-muted-foreground text-sm">
        No table data available
      </div>
    );
  }

  return (
    <RenderErrorBoundary
      fallback={
        <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Error rendering table data
        </div>
      }
      onError={() => setHasError(true)}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {data.headers.map((header, idx) => (
                <th key={idx} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <SafeTextRenderer value={header} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border/50 last:border-0">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-foreground">
                    <SafeTextRenderer value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RenderErrorBoundary>
  );
}

/**
 * CustomDisplay - Fallback for custom data types (renders JSON)
 */
function CustomDisplay({ data }: { data: unknown }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Error rendering custom data
      </div>
    );
  }

  let json: string;
  try {
    json = JSON.stringify(data, null, 2);
  } catch {
    setHasError(true);
    return null;
  }

  return (
    <RenderErrorBoundary
      fallback={
        <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Error rendering custom data
        </div>
      }
      onError={() => setHasError(true)}
    >
      <pre className="p-4 bg-card/50 rounded-lg border border-border/50 text-xs text-foreground overflow-x-auto">
        {json}
      </pre>
    </RenderErrorBoundary>
  );
}

/**
 * Format timestamp to relative time (e.g., "5m ago")
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / MS_PER_HOUR);
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE);

  if (hours > HOURS_PER_DAY) {
    return date.toLocaleDateString();
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

/**
 * InfoGathering - Displays task results grouped by category
 * Features:
 * - Grouped results by category with expandable sections
 * - Multiple data type displays (key-value, table, custom)
 * - Manual refresh per task
 * - Relative timestamps
 * - Clear individual or all results
 * - Error boundary for each data renderer
 */
export function InfoGathering({
  results,
  onRefreshTask,
  onClearResult,
  onClearAll,
  onHeaderDoubleClick,
  refreshingTasks = []
}: InfoGatheringProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [renderErrors, setRenderErrors] = useState<Set<string>>(new Set());

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, InfoGatheringResult[]>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedResults).sort();

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(sortedCategories));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Render data based on type with error handling
  const renderData = (result: InfoGatheringResult) => {
    // Check if this result has a render error
    if (renderErrors.has(result.taskName)) {
      return (
        <div className="p-4 bg-red-950/30 rounded-lg border border-red-800/50 text-center text-red-400 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Error rendering this result
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRenderErrors(prev => {
              const next = new Set(prev);
              next.delete(result.taskName);
              return next;
            })}
            className="ml-2 h-6 text-xs"
          >
            Retry
          </Button>
        </div>
      );
    }

    try {
      switch (result.metadata.dataType) {
        case 'key-value':
          if (typeof result.data === 'object' && result.data !== null && !Array.isArray(result.data)) {
            return <KeyValueDisplay data={result.data as Record<string, unknown>} />;
          }
          return <CustomDisplay data={result.data} />;

        case 'table':
          if (
            typeof result.data === 'object' &&
            result.data !== null &&
            'headers' in result.data &&
            'rows' in result.data
          ) {
            return <TableDisplay data={result.data as { headers: string[]; rows: unknown[][] }} />;
          }
          return <CustomDisplay data={result.data} />;

        case 'custom':
        default:
          return <CustomDisplay data={result.data} />;
      }
    } catch {
      // Mark this result as having a render error
      setRenderErrors(prev => new Set(prev).add(result.taskName));
      return null;
    }
  };

  const totalResults = results.length;
  const uniqueCategories = sortedCategories.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="card-premium flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50 bg-muted/20" onDoubleClick={onHeaderDoubleClick}>
          <CardTitle className="text-foreground font-medium tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Information Gathering
            {totalResults > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {totalResults}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground">
                {uniqueCategories} category{uniqueCategories !== 1 ? 's' : ''}
              </span>
            </div>
            {totalResults > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  className="h-8 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  title="Expand all"
                >
                  Expand
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  className="h-8 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  title="Collapse all"
                >
                  Collapse
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs">Clear</span>
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 bg-black/20">
          <ScrollArea className={`w-full`} style={{ height: SCROLL_AREA_HEIGHT }}>
            <div className="p-4 space-y-3">
              {totalResults === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                  <Database className="w-12 h-12 mb-3 text-primary/20" />
                  <p className="text-sm font-medium">No information gathered</p>
                  <p className="text-xs mt-1">Run info-gathering tasks to see results here</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedCategories.map((category) => {
                    const categoryResults = groupedResults[category];
                    const isExpanded = expandedCategories.has(category);

                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="group"
                      >
                        {/* Category header */}
                        <div
                          onClick={() => toggleCategory(category)}
                          className="relative flex items-center justify-between p-3 bg-card/50 border border-border/50 rounded-xl cursor-pointer hover:bg-muted/50 hover:border-border/80 transition-all duration-300"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                          <div className="relative flex items-center gap-3 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-primary/30">
                              <Layers className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-foreground font-semibold text-sm">
                                  {category}
                                </h3>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                                  {categoryResults.length}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(categoryResults[0]?.lastUpdated || '')}
                              </p>
                            </div>
                            <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 ml-4 space-y-3 pl-4 border-l-2 border-border">
                                {categoryResults.map((result) => {
                                  const isRefreshing = refreshingTasks.includes(result.taskName);

                                  return (
                                    <div
                                      key={result.taskName}
                                      className="p-3 bg-card/30 rounded-lg border border-border/50"
                                    >
                                      {/* Result header */}
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm font-semibold text-foreground truncate">
                                            <SafeTextRenderer value={result.displayName} />
                                          </h4>
                                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {formatTimestamp(result.lastUpdated)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRefreshTask(result.taskName)}
                                            disabled={isRefreshing}
                                            className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors gap-1"
                                            title="Refresh this task"
                                          >
                                            {isRefreshing ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <RefreshCw className="w-3.5 h-3.5" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onClearResult(result.taskName)}
                                            className="h-7 px-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors"
                                            title="Clear this result"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Data display */}
                                      <div className="mt-3">
                                        {renderData(result)}
                                      </div>
                                    </div>
                                  );
                                })}
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
    </motion.div>
  );
}
