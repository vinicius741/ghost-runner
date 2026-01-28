/**
 * Browser Configuration Section Component for Settings Manager
 *
 * Manages browser channel selection and custom executable path.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.4
 */

import { Input } from '@/components/ui/input';
import { Chrome } from 'lucide-react';

export type BrowserChannel = 'chrome' | 'chromium' | 'msedge';

export interface BrowserConfigSectionProps {
  /** Current browser channel */
  browserChannel?: BrowserChannel;
  /** Custom executable path */
  executablePath?: string;
  /** Current profile directory (read-only) */
  profileDir?: string;
  /** Callback when browser channel changes */
  onBrowserChannelChange: (channel: BrowserChannel) => void;
  /** Callback when executable path changes */
  onExecutablePathChange: (path?: string) => void;
}

/**
 * Browser configuration section with channel selection and custom path.
 *
 * @example
 * <BrowserConfigSection
 *   browserChannel={settings.browserChannel || 'chrome'}
 *   executablePath={settings.executablePath}
 *   profileDir={settings.profileDir}
 *   onBrowserChannelChange={(channel) => setSettings({ ...settings, browserChannel: channel })}
 *   onExecutablePathChange={(path) => setSettings({ ...settings, executablePath: path })}
 * />
 */
export function BrowserConfigSection({
  browserChannel = 'chrome',
  executablePath,
  profileDir,
  onBrowserChannelChange,
  onExecutablePathChange,
}: BrowserConfigSectionProps) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
      <div className="flex items-center gap-2 mb-2">
        <Chrome className="w-4 h-4 text-green-500" />
        <h3 className="text-slate-100 font-medium tracking-tight">Browser Configuration</h3>
      </div>

      {/* Browser channel selection */}
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
        Browser Channel
      </p>
      <div className="space-y-2">
        <select
          value={browserChannel}
          onChange={(e) => onBrowserChannelChange(e.target.value as BrowserChannel)}
          className="w-full h-10 bg-slate-900 border border-slate-800 text-slate-200 focus:border-green-500/50 focus:ring-green-500/20 rounded-lg px-3 text-sm"
          aria-label="Select browser channel"
        >
          <option value="chrome">System Chrome (Recommended)</option>
          <option value="chromium">Chromium</option>
          <option value="msedge">Microsoft Edge</option>
        </select>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Select which browser to use. System Chrome is recommended for best compatibility.
        </p>
      </div>

      {/* Custom executable path */}
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 mt-4">
        Custom Executable Path (Advanced)
      </p>
      <div className="space-y-2">
        <Input
          type="text"
          value={executablePath || ''}
          onChange={(e) => onExecutablePathChange(e.target.value || undefined)}
          placeholder="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          className="h-10 bg-slate-900 border-slate-800 text-slate-200 focus:border-green-500/50 focus:ring-green-500/20 transition-all font-mono text-sm"
          aria-label="Custom executable path"
        />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Optional: Specify a custom Chrome executable path. Leave empty to use system Chrome.
        </p>
      </div>

      {/* Current profile display */}
      {profileDir && (
        <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
            Current Profile
          </p>
          <p className="text-xs text-slate-400 font-mono break-all">{profileDir}</p>
        </div>
      )}
    </div>
  );
}
