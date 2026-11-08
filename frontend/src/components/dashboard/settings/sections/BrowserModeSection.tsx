/**
 * Headless / visible browser toggle.
 */

import { cn } from '@/lib/utils';

export interface BrowserModeSectionProps {
  headless: boolean;
  onHeadlessChange: (headless: boolean) => void;
}

/**
 * Rendered inside the Browser settings section as a single switch row.
 */
export function BrowserModeSection({ headless, onHeadlessChange }: BrowserModeSectionProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] text-foreground">Run headless</p>
        <p className="text-xs text-muted-foreground">
          {headless
            ? 'The browser runs without a visible window. Recommended on macOS.'
            : 'A browser window is shown while tasks run.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onHeadlessChange(!headless)}
        aria-pressed={headless}
        aria-label="Toggle headless mode"
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          headless ? 'border-primary bg-primary' : 'border-border-strong bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full',
            headless ? 'translate-x-[18px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
          )}
        />
      </button>
    </div>
  );
}
