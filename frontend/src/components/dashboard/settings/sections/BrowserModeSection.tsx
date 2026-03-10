/**
 * Browser Mode Section Component for Settings Manager
 *
 * Manages headless/headful browser mode settings.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.3
 */

import { Monitor, Eye, EyeOff } from 'lucide-react';

export interface BrowserModeSectionProps {
  /** Whether headless mode is enabled */
  headless: boolean;
  /** Callback when headless mode is toggled */
  onHeadlessChange: (headless: boolean) => void;
}

/**
 * Browser mode section with headless toggle.
 *
 * @example
 * <BrowserModeSection
 *   headless={settings.headless ?? false}
 *   onHeadlessChange={(headless) => setSettings({ ...settings, headless })}
 * />
 */
export function BrowserModeSection({
  headless,
  onHeadlessChange,
}: BrowserModeSectionProps) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Monitor className="w-4 h-4 text-purple-500" />
        <h3 className="text-foreground font-medium tracking-tight">Browser Mode</h3>
      </div>

      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3">
        Headless Mode
      </p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
        <div className="flex items-center gap-3">
          {headless ? (
            <EyeOff className="w-4 h-4 text-purple-500" />
          ) : (
            <Eye className="w-4 h-4 text-purple-500" />
          )}
          <div className="flex flex-col">
            <span className="text-sm text-foreground">
              {headless ? 'Headless (Hidden)' : 'Headful (Visible)'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {headless
                ? 'Browser runs without visible window'
                : 'Browser window will be visible'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onHeadlessChange(!headless)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            headless ? 'bg-primary' : 'bg-muted'
          }`}
          aria-pressed={headless}
          aria-label="Toggle headless mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
              headless ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Headless mode is recommended on macOS to avoid browser crashes.
        Set to false to see the browser window during automation.
      </p>
    </div>
  );
}
