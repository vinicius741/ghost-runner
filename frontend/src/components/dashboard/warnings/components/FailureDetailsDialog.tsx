/**
 * Failure details: diagnostics, captured artifacts, recent logs, and a
 * ready-to-copy repair prompt for an AI coding agent.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Copy, ExternalLink, Image, FileCode2, Bug, Check } from 'lucide-react';
import type { FailureRecord } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getFailureType } from '@/lib/failureTypes';
import { cn } from '@/lib/utils';

export interface FailureDetailsDialogProps {
  failure: FailureRecord | null;
  onClose: () => void;
  onDismiss: (id: string) => void;
}

function stringifyValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}

function getContextString(context: Record<string, unknown>, key: string): string | undefined {
  const value = context[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function Field({ label, value, mono = true }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className={cn('whitespace-pre-wrap break-words text-[13px] text-foreground/90', mono && 'font-mono text-xs')}>
        {stringifyValue(value)}
      </dd>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const ARTIFACT_LINK =
  'inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground';

function buildAgentPrompt(failure: FailureRecord): string {
  const c = failure.context || {};
  const important = {
    taskName: failure.taskName,
    errorType: failure.errorType,
    errorMessage: c.errorMessage,
    selector: c.selector,
    failedUrl: c.pageUrl || c.url,
    pageTitle: c.pageTitle,
    timeout: c.timeout,
    responseStatus: c.responseStatus,
    details: c.details,
    screenshotUrl: c.screenshotUrl,
    htmlUrl: c.htmlUrl,
    diagnosticsUrl: c.diagnosticsUrl,
    firstSeen: failure.timestamp,
    lastSeen: failure.lastSeen,
    occurrences: failure.count,
  };

  return `You are working in the Ghost Runner automation repo. Fix this failing Playwright task so the same failure does not happen again.

Failure summary:
${JSON.stringify(important, null, 2)}

Recent task logs:
${stringifyValue(c.recentLogs || [])}

Full failure context:
${JSON.stringify(c, null, 2)}

What I need you to do:
1. Inspect the task named "${failure.taskName}" in tasks/public or tasks/private.
2. Use the screenshot and captured HTML artifacts (if available) to understand the current page state.
3. Identify the brittle selector/navigation/wait condition that caused the failure.
4. Update the task to use more robust Playwright locators, waits, validation, and helpful errors.
5. Preserve the task's intended behavior and do not hardcode secrets.
6. Run the relevant task/test command and report exactly what changed.`;
}

export function FailureDetailsDialog({ failure, onClose, onDismiss }: FailureDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  const agentPrompt = useMemo(() => (failure ? buildAgentPrompt(failure) : ''), [failure]);

  const context = failure?.context || {};
  const screenshotUrl = getContextString(context, 'screenshotUrl');
  const htmlUrl = getContextString(context, 'htmlUrl');
  const diagnosticsUrl = getContextString(context, 'diagnosticsUrl');
  const recentLogs = Array.isArray(context.recentLogs) ? context.recentLogs : [];
  const hiddenKeys = new Set(['errorMessage', 'recentLogs', 'screenshotUrl', 'htmlUrl', 'diagnosticsUrl']);
  const extraContext = Object.entries(context).filter(([key]) => !hiddenKeys.has(key));
  const type = failure ? getFailureType(failure.errorType) : null;
  const Icon = type?.icon ?? Bug;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={failure !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {failure && type && (
          <>
            <DialogHeader className="flex-row items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-strong bg-background">
                <Icon className={cn('h-4 w-4', type.tone)} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate">{failure.taskName}</DialogTitle>
                <DialogDescription>
                  {type.label} · {failure.count} occurrence{failure.count !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0 space-y-5 p-5 lg:border-r lg:border-border">
                <Section title="Error">
                  <p className="whitespace-pre-wrap break-words rounded-md border border-destructive/25 bg-destructive/[0.06] px-3 py-2 font-mono text-xs text-destructive">
                    {stringifyValue(context.errorMessage || 'Unknown error')}
                  </p>
                  <dl className="grid grid-cols-2 gap-3">
                    <Field label="Last seen" value={new Date(failure.lastSeen).toLocaleString()} mono={false} />
                    <Field label="First seen" value={new Date(failure.timestamp).toLocaleString()} mono={false} />
                  </dl>
                </Section>

                {(screenshotUrl || htmlUrl || diagnosticsUrl) && (
                  <Section title="Captured artifacts">
                    {screenshotUrl && (
                      <a href={screenshotUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                        <img src={screenshotUrl} alt="Failure screenshot" className="max-h-64 w-full bg-black object-contain" />
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {screenshotUrl && <a className={ARTIFACT_LINK} href={screenshotUrl} target="_blank" rel="noreferrer"><Image className="h-3.5 w-3.5" />Screenshot<ExternalLink className="h-3 w-3" /></a>}
                      {htmlUrl && <a className={ARTIFACT_LINK} href={htmlUrl} target="_blank" rel="noreferrer"><FileCode2 className="h-3.5 w-3.5" />HTML<ExternalLink className="h-3 w-3" /></a>}
                      {diagnosticsUrl && <a className={ARTIFACT_LINK} href={diagnosticsUrl} target="_blank" rel="noreferrer"><Bug className="h-3.5 w-3.5" />Diagnostics<ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </Section>
                )}

                <Section title="Recent logs">
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background px-3 py-2 text-xs text-foreground/80">
                    {recentLogs.length ? recentLogs.join('\n') : 'No recent task logs captured.'}
                  </pre>
                </Section>

                {extraContext.length > 0 && (
                  <Section title="Context">
                    <dl className="space-y-3">
                      {extraContext.map(([key, value]) => (
                        <Field key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={value} />
                      ))}
                    </dl>
                  </Section>
                )}
              </div>

              <div className="min-w-0 space-y-3 p-5">
                <Section
                  title="Repair prompt"
                  action={
                    <Button size="sm" onClick={() => void copyPrompt()}>
                      {copied ? <Check /> : <Copy />}
                      {copied ? 'Copied' : 'Copy prompt'}
                    </Button>
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    Paste into Claude Code or another coding agent. It includes the failure, artifacts, logs, and the requested fix.
                  </p>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-background px-3 py-2 text-xs text-foreground/80">
                    {agentPrompt}
                  </pre>
                </Section>
              </div>
            </div>

            <DialogFooter className="border-t border-border px-5 py-3">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onDismiss(failure.id);
                  onClose();
                }}
              >
                Dismiss failure
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
