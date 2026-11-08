/**
 * One task's failures: a summary row that expands to list each distinct
 * failure with its selector / URL / message and a link to full details.
 */

import { ChevronDown, ChevronRight, Camera, FileCode2 } from 'lucide-react';
import type { FailureRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { getFailureType } from '@/lib/failureTypes';
import { formatAgo } from '@/lib/schedule';
import { cn } from '@/lib/utils';

export interface FailureCardProps {
  taskName: string;
  failures: FailureRecord[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (failure: FailureRecord) => void;
}

function contextString(failure: FailureRecord, key: string): string | undefined {
  const value = failure.context?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function FailureItem({ failure, onViewDetails }: { failure: FailureRecord; onViewDetails: (f: FailureRecord) => void }) {
  const type = getFailureType(failure.errorType);
  const selector = contextString(failure, 'selector');
  const url = contextString(failure, 'url');
  const message = contextString(failure, 'errorMessage');
  const hasScreenshot = Boolean(contextString(failure, 'screenshotUrl'));
  const hasHtml = Boolean(contextString(failure, 'htmlUrl'));

  return (
    <li className="flex min-w-0 items-start gap-3 py-2.5 pl-11 pr-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={cn('font-medium', type.tone)}>{type.label}</span>
          <span className="text-faint">×{failure.count}</span>
          <span className="text-faint">{formatAgo(failure.lastSeen)}</span>
          {hasScreenshot && (
            <span className="inline-flex items-center gap-1 text-faint">
              <Camera className="h-3 w-3" /> screenshot
            </span>
          )}
          {hasHtml && (
            <span className="inline-flex items-center gap-1 text-faint">
              <FileCode2 className="h-3 w-3" /> html
            </span>
          )}
        </div>
        {message && <p className="truncate font-mono text-xs text-foreground/80" title={message}>{message}</p>}
        {selector && (
          <p className="truncate font-mono text-xs text-muted-foreground" title={selector}>
            <span className="text-faint">selector </span>{selector}
          </p>
        )}
        {url && (
          <p className="truncate font-mono text-xs text-muted-foreground" title={url}>
            <span className="text-faint">url </span>{url}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => onViewDetails(failure)}>
        Details
      </Button>
    </li>
  );
}

export function FailureCard({
  taskName,
  failures,
  isExpanded,
  onToggle,
  onViewDetails,
}: FailureCardProps) {
  const sorted = [...failures].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
  const latest = sorted[0];
  const type = getFailureType(latest.errorType);
  const Icon = type.icon;
  const totalCount = failures.reduce((sum, f) => sum + f.count, 0);
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-background">
          <Icon className={cn('h-3.5 w-3.5', type.tone)} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">{taskName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {type.label} · last {formatAgo(latest.lastSeen)}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-destructive tabular-nums" title="Total occurrences">
          {totalCount}×
        </span>
        <Chevron className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
      </button>

      {isExpanded && (
        <ul className="divide-y divide-border border-t border-border bg-background/50">
          {sorted.map((failure) => (
            <FailureItem key={failure.id} failure={failure} onViewDetails={onViewDetails} />
          ))}
        </ul>
      )}
    </li>
  );
}
