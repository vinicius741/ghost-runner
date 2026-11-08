/**
 * Browser channel, custom executable path, and the active profile.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type BrowserChannel = 'chrome' | 'chromium' | 'msedge';

export interface BrowserConfigSectionProps {
  browserChannel?: BrowserChannel;
  executablePath?: string;
  /** Current profile directory (read-only). */
  profileDir?: string;
  onBrowserChannelChange: (channel: BrowserChannel) => void;
  onExecutablePathChange: (path?: string) => void;
}

export function BrowserConfigSection({
  browserChannel = 'chrome',
  executablePath,
  profileDir,
  onBrowserChannelChange,
  onExecutablePathChange,
}: BrowserConfigSectionProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="browser-channel">Browser</Label>
        <Select value={browserChannel} onValueChange={(v: BrowserChannel) => onBrowserChannelChange(v)}>
          <SelectTrigger id="browser-channel" className="sm:w-72" aria-label="Select browser channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chrome">System Chrome (recommended)</SelectItem>
            <SelectItem value="chromium">Chromium</SelectItem>
            <SelectItem value="msedge">Microsoft Edge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="executable-path">Custom executable path</Label>
        <Input
          id="executable-path"
          type="text"
          value={executablePath || ''}
          onChange={(e) => onExecutablePathChange(e.target.value || undefined)}
          placeholder="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          className="font-mono text-xs"
          aria-label="Custom executable path"
        />
        <p className="text-xs text-faint">Optional. Leave empty to use the browser selected above.</p>
      </div>

      {profileDir && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Profile directory</p>
          <p className="break-all font-mono text-xs text-faint">{profileDir}</p>
        </div>
      )}
    </>
  );
}
