/**
 * Failure Details Dialog Component for Warnings Panel
 *
 * Shows task failure diagnostics, captured artifacts, recent logs, and a
 * ready-to-copy repair prompt for an AI coding agent.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { type LucideIcon, X, MapPin, AlertCircle, Timer, Bug, Copy, ExternalLink, Image, FileCode2, TerminalSquare, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FailureRecord } from '@/types';
import { useFailureStyles } from '@/hooks/useFailureStyles';
import { toTitleCase } from '@/utils/formatters';
import { type ErrorType } from '@/utils/styleHelpers';

const ERROR_ICONS: Record<ErrorType, LucideIcon> = {
  element_not_found: MapPin,
  navigation_failure: AlertCircle,
  timeout: Timer,
  unknown: Bug,
};

export interface FailureDetailsDialogProps {
  failure: FailureRecord | null;
  onClose: () => void;
  onDismiss: (id: string) => void;
}

interface ContextValueProps {
  label: string;
  value: unknown;
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

function ContextValue({ label, value }: ContextValueProps) {
  return (
    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/70">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
        {stringifyValue(value)}
      </pre>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

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
  const styles = useFailureStyles();
  const [copied, setCopied] = useState(false);
  const agentPrompt = useMemo(() => failure ? buildAgentPrompt(failure) : '', [failure]);

  if (!failure) {
    return null;
  }

  const context = failure.context || {};
  const screenshotUrl = getContextString(context, 'screenshotUrl');
  const htmlUrl = getContextString(context, 'htmlUrl');
  const diagnosticsUrl = getContextString(context, 'diagnosticsUrl');
  const recentLogs = Array.isArray(context.recentLogs) ? context.recentLogs : [];
  const hiddenKeys = new Set(['errorMessage', 'recentLogs', 'screenshotUrl', 'htmlUrl', 'diagnosticsUrl']);
  const Icon = ERROR_ICONS[failure.errorType] || Bug;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-4xl w-full bg-slate-950 border border-red-900/40 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className={`absolute -inset-0.5 bg-gradient-to-r ${styles.getGradient(failure.errorType)} rounded-2xl blur opacity-40`} />
          <div className="relative">
            <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-red-950/45 via-slate-950 to-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl bg-red-950/40 flex items-center justify-center border ${styles.getBorder(failure.errorType)} shadow-lg shadow-red-950/30`}>
                    <Icon className={`w-7 h-7 ${styles.getColor(failure.errorType)}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.28em] text-red-300/70 font-semibold">Failure requires attention</p>
                    <h3 className="text-xl font-semibold text-slate-100 truncate">{failure.taskName}</h3>
                    <p className="text-sm text-slate-400">{toTitleCase(failure.errorType)} · {failure.count} occurrence{failure.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 transition-colors" aria-label="Close dialog">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-0 max-h-[72vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-5 border-r border-slate-800/80">
                <Section icon={<AlertCircle className="w-4 h-4" />} title="What went wrong">
                  <ContextValue label="Error Message" value={context.errorMessage || 'Unknown error'} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ContextValue label="Last Seen" value={new Date(failure.lastSeen).toLocaleString()} />
                    <ContextValue label="First Occurred" value={new Date(failure.timestamp).toLocaleString()} />
                  </div>
                </Section>

                {(screenshotUrl || htmlUrl || diagnosticsUrl) && (
                  <Section icon={<Image className="w-4 h-4" />} title="Captured page artifacts">
                    {screenshotUrl && (
                      <a href={screenshotUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 hover:border-red-500/50 transition-colors">
                        <img src={screenshotUrl} alt="Failure screenshot" className="w-full max-h-64 object-contain bg-black" />
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {screenshotUrl && <a className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-sm hover:bg-slate-800 inline-flex items-center gap-2" href={screenshotUrl} target="_blank" rel="noreferrer"><Image className="w-4 h-4" />Open screenshot<ExternalLink className="w-3 h-3" /></a>}
                      {htmlUrl && <a className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-sm hover:bg-slate-800 inline-flex items-center gap-2" href={htmlUrl} target="_blank" rel="noreferrer"><FileCode2 className="w-4 h-4" />Open HTML<ExternalLink className="w-3 h-3" /></a>}
                      {diagnosticsUrl && <a className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-sm hover:bg-slate-800 inline-flex items-center gap-2" href={diagnosticsUrl} target="_blank" rel="noreferrer"><Bug className="w-4 h-4" />Diagnostics<ExternalLink className="w-3 h-3" /></a>}
                    </div>
                  </Section>
                )}

                <Section icon={<TerminalSquare className="w-4 h-4" />} title="Recent logs">
                  <pre className="p-3 bg-black/70 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-52 overflow-auto custom-scrollbar">{recentLogs.length ? recentLogs.join('\n') : 'No recent task logs captured.'}</pre>
                </Section>
              </div>

              <div className="p-6 space-y-5 bg-slate-950/70">
                <Section icon={<Sparkles className="w-4 h-4 text-amber-300" />} title="Copy/paste agent prompt">
                  <p className="text-sm text-slate-400">Send this to Claude Code or another coding agent. It includes the failure, artifacts, logs, and requested fix.</p>
                  <button onClick={copyPrompt} className="w-full px-4 py-3 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied prompt' : 'Copy repair prompt'}
                  </button>
                  <pre className="p-3 bg-black/60 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-72 overflow-auto custom-scrollbar">{agentPrompt}</pre>
                </Section>

                <Section icon={<Bug className="w-4 h-4" />} title="Full structured context">
                  <div className="space-y-2">
                    {Object.entries(context).filter(([key]) => !hiddenKeys.has(key)).map(([key, value]) => (
                      <ContextValue key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={value} />
                    ))}
                  </div>
                </Section>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button onClick={() => { onDismiss(failure.id); onClose(); }} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
