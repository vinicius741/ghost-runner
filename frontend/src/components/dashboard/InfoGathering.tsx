import { Component, type ReactNode } from 'react';
import { Database, RefreshCw, Trash2, Loader2, AlertCircle } from 'lucide-react';
import type { InfoGatheringResult } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { formatAgo } from '@/lib/schedule';

interface InfoGatheringProps {
  results: InfoGatheringResult[];
  onRefreshTask: (taskName: string) => void;
  onClearResult: (taskName: string) => void;
  refreshingTasks?: string[];
}

/** Catches render errors from unexpected result shapes, per result. */
class RenderErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { hasError: boolean; resetKey: string }
> {
  constructor(props: { children: ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { hasError: boolean; resetKey: string }
  ) {
    // A new payload for the same task gets a fresh attempt at rendering.
    return props.resetKey !== state.resetKey ? { hasError: false, resetKey: props.resetKey } : null;
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          This result could not be displayed.
        </p>
      );
    }
    return this.props.children;
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function KeyValueDisplay({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-[13px]">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="truncate text-muted-foreground">{key}</dt>
          <dd className="break-words text-foreground tabular-nums">{display(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function TableDisplay({ data }: { data: { headers: unknown[]; rows: unknown[][] } }) {
  if (!Array.isArray(data.headers) || !Array.isArray(data.rows) || data.rows.length === 0) {
    return <p className="text-xs text-faint">No rows.</p>;
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {data.headers.map((header, idx) => (
              <th key={idx} className="px-4 pb-2 text-left text-xs font-medium text-muted-foreground">
                {display(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {(Array.isArray(row) ? row : [row]).map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-1.5 text-foreground tabular-nums">
                  {display(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JsonDisplay({ data }: { data: unknown }) {
  let json: string;
  try {
    json = JSON.stringify(data, null, 2) ?? String(data);
  } catch {
    json = String(data);
  }
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground/85">
      {json}
    </pre>
  );
}

function ResultData({ result }: { result: InfoGatheringResult }) {
  const { data } = result;
  const isObject = typeof data === 'object' && data !== null;

  if (result.metadata?.dataType === 'key-value' && isObject && !Array.isArray(data)) {
    return <KeyValueDisplay data={data as Record<string, unknown>} />;
  }
  if (result.metadata?.dataType === 'table' && isObject && 'headers' in data && 'rows' in data) {
    return <TableDisplay data={data as { headers: unknown[]; rows: unknown[][] }} />;
  }
  return <JsonDisplay data={data} />;
}

/**
 * Results returned by info-gathering tasks, grouped by category.
 */
export function InfoGathering({
  results,
  onRefreshTask,
  onClearResult,
  refreshingTasks = [],
}: InfoGatheringProps) {
  if (results.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Database}
          title="No data gathered yet"
          description="Tasks that return data appear here, grouped by category."
        />
      </Card>
    );
  }

  const sorted = [...results].sort(
    (a, b) => a.category.localeCompare(b.category) || String(a.displayName).localeCompare(String(b.displayName))
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      {sorted.map((result) => {
        const isRefreshing = refreshingTasks.includes(result.taskName);
        return (
        <Card key={result.taskName} className="overflow-hidden">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle className="truncate">{display(result.displayName)}</CardTitle>
              <p className="truncate text-xs text-faint">
                {result.category} · {result.taskName} · updated {formatAgo(result.lastUpdated)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRefreshTask(result.taskName)}
                disabled={isRefreshing}
                aria-label={`Refresh ${result.taskName}`}
                title="Run again"
              >
                {isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onClearResult(result.taskName)}
                aria-label={`Remove ${result.taskName} result`}
                title="Remove result"
                className="hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </CardHeader>
          <div className="p-4">
            <RenderErrorBoundary resetKey={`${result.taskName}:${result.lastUpdated}`}>
              <ResultData result={result} />
            </RenderErrorBoundary>
          </div>
        </Card>
        );
      })}
    </div>
  );
}
