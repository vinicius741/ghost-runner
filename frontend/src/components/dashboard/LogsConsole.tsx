import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LogEntry } from '@shared/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { cn } from '@/lib/utils';

type LogFilter = 'all' | 'error' | 'system';

interface LogsConsoleProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  title?: string;
  /** Show only the most recent N lines (keeps compact panels light). */
  limit?: number;
  /** Show the All / Errors / System filter. */
  filterable?: boolean;
  className?: string;
  /** Classes for the scrolling body, e.g. a fixed height. */
  bodyClassName?: string;
}

const FOLLOW_THRESHOLD_PX = 32;

export function LogsConsole({
  logs,
  onClearLogs,
  title = 'Logs',
  limit,
  filterable = false,
  className,
  bodyClassName = 'h-[360px]',
}: LogsConsoleProps) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? logs : logs.filter((log) => log.type === filter);
    return limit ? filtered.slice(-limit) : filtered;
  }, [logs, filter, limit]);

  const errorCount = useMemo(() => logs.filter((log) => log.type === 'error').length, [logs]);

  // Keep the newest line in view, but only while the reader is already at
  // the bottom; scrolling up to read history pauses following.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visible]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD_PX;
  };

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader>
        <CardTitle>
          {title}
          <span className="font-mono text-xs font-normal text-faint tabular-nums">{logs.length}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {filterable && (
            <SegmentedControl
              size="sm"
              ariaLabel="Filter logs"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'error', label: errorCount > 0 ? `Errors ${errorCount}` : 'Errors' },
                { value: 'system', label: 'System' },
              ]}
            />
          )}
          <Button variant="ghost" size="sm" onClick={onClearLogs} disabled={logs.length === 0}>
            Clear
          </Button>
        </div>
      </CardHeader>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn('min-h-0 overflow-y-auto bg-background/60 py-2 font-mono text-xs leading-[1.6]', bodyClassName)}
        role="log"
        aria-live="polite"
        aria-label={title}
      >
        {visible.length === 0 ? (
          <p className="px-4 py-2 text-faint">
            {logs.length === 0 ? 'No output yet. Logs from tasks and the scheduler stream here.' : 'No lines match this filter.'}
          </p>
        ) : (
          visible.map((log, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3 border-l-2 px-4 py-px',
                log.type === 'error'
                  ? 'border-destructive bg-destructive/[0.06] text-destructive'
                  : log.type === 'system'
                    ? 'border-transparent text-primary'
                    : 'border-transparent text-foreground/80'
              )}
            >
              <span className="shrink-0 select-none text-faint tabular-nums">{log.timestamp}</span>
              <span className="min-w-0 whitespace-pre-wrap break-words">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
