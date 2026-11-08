/**
 * Settings Manager - manages application settings including geolocation,
 * browser mode, browser configuration, and authentication.
 *
 * Refactored in Phase 2 to use extracted sections:
 * - GeolocationSection for location settings
 * - BrowserModeSection for headless mode
 * - BrowserConfigSection for browser channel and executable path
 * - AuthenticationSection for session management
 *
 * Related: Development Execution Plan Task 2.3.9
 */

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from 'lucide-react';
import type { Settings, GeolocationSettings } from '@/types';
import { DEFAULT_LOCATION } from '@/types';
import { GeolocationSection } from './settings/sections/GeolocationSection';
import { BrowserModeSection } from './settings/sections/BrowserModeSection';
import { BrowserConfigSection, type BrowserChannel } from './settings/sections/BrowserConfigSection';
import { AuthenticationSection } from './settings/sections/AuthenticationSection';
import { SettingsSection } from './settings/components/SettingsSection';
import { apiClient } from '@/lib/apiClient';

export interface SettingsManagerProps {
  onSettingsSaved?: () => void;
  onLog?: (message: string, type: 'normal' | 'error' | 'system') => void;
}

/**
 * Main SettingsManager component.
 */
export function SettingsManager({ onSettingsSaved, onLog }: SettingsManagerProps) {
  const [settings, setSettings] = useState<Settings>({
    geolocation: { ...DEFAULT_LOCATION },
    headless: false,
    browserChannel: 'chrome'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingUpLogin, setSettingUpLogin] = useState(false);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/settings');
      if (res.data.settings) {
        // Merge with defaults to ensure all fields are present
        setSettings({
          geolocation: res.data.settings.geolocation || { ...DEFAULT_LOCATION },
          headless: res.data.settings.headless ?? false,
          browserChannel: res.data.settings.browserChannel || 'chrome',
          executablePath: res.data.settings.executablePath,
          profileDir: res.data.settings.profileDir
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: Settings): Promise<boolean> => {
    try {
      const res = await apiClient.post('/api/settings', { settings: settingsToSave });
      if (res.data.error) throw new Error(res.data.error);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveSettings(settings);
    if (success) {
      onSettingsSaved?.();
    }
    setSaving(false);
  };

  const handleSetupLogin = async () => {
    setSettingUpLogin(true);
    try {
      const res = await apiClient.post('/api/setup-login');
      if (res.data.error) throw new Error(res.data.error);
      onLog?.(res.data.message, 'system');
    } catch (error) {
      console.error('Error starting setup login:', error);
    } finally {
      setSettingUpLogin(false);
    }
  };

  const updateGeolocation = (geolocation: GeolocationSettings) => {
    setSettings((prev) => ({ ...prev, geolocation }));
  };

  const updateHeadless = (headless: boolean) => {
    setSettings((prev) => ({ ...prev, headless }));
  };

  const updateBrowserChannel = (browserChannel: BrowserChannel) => {
    setSettings((prev) => ({ ...prev, browserChannel }));
  };

  const updateExecutablePath = (executablePath?: string) => {
    setSettings((prev) => ({ ...prev, executablePath }));
  };

  return (
    <div className="space-y-4">
      <Card className="divide-y divide-border">
        <GeolocationSection
          geolocation={settings.geolocation}
          onGeolocationChange={updateGeolocation}
          onSaveSettings={saveSettings}
          onSettingsSaved={onSettingsSaved}
          onLog={onLog}
        />

        <SettingsSection
          title="Browser"
          description="Which browser launches tasks and how. Changes apply to new browser instances."
        >
          <BrowserModeSection
            headless={settings.headless ?? false}
            onHeadlessChange={updateHeadless}
          />
          <BrowserConfigSection
            browserChannel={settings.browserChannel as BrowserChannel}
            executablePath={settings.executablePath}
            profileDir={settings.profileDir}
            onBrowserChannelChange={updateBrowserChannel}
            onExecutablePathChange={updateExecutablePath}
          />
        </SettingsSection>

        <AuthenticationSection
          isSettingUpLogin={settingUpLogin}
          isLoading={loading}
          onSetupLogin={handleSetupLogin}
        />
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto text-xs text-faint">Profiles update the next time a browser launches.</p>
        <Button variant="ghost" onClick={fetchSettings} disabled={loading || saving}>
          {loading ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          Reload
        </Button>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
