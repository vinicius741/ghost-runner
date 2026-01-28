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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Save, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Settings, GeolocationSettings } from '@/types';
import { DEFAULT_LOCATION } from '@/types';
import { GeolocationSection } from './settings/sections/GeolocationSection';
import { BrowserModeSection } from './settings/sections/BrowserModeSection';
import { BrowserConfigSection, type BrowserChannel } from './settings/sections/BrowserConfigSection';
import { AuthenticationSection } from './settings/sections/AuthenticationSection';

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
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        // Merge with defaults to ensure all fields are present
        setSettings({
          geolocation: data.settings.geolocation || { ...DEFAULT_LOCATION },
          headless: data.settings.headless ?? false,
          browserChannel: data.settings.browserChannel || 'chrome',
          executablePath: data.settings.executablePath,
          profileDir: data.settings.profileDir
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      onLog?.('Error fetching settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: Settings): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      onLog?.('Failed to save settings', 'error');
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
      const res = await fetch('/api/setup-login', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onLog?.(data.message, 'system');
    } catch (error) {
      console.error('Error starting setup login:', error);
      const message = error instanceof Error ? error.message : String(error);
      onLog?.(`Failed to start setup login: ${message}`, 'error');
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
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="card-premium h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            Geolocation Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchSettings}
            disabled={loading}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Geolocation section */}
          <GeolocationSection
            geolocation={settings.geolocation}
            onGeolocationChange={updateGeolocation}
            onSaveSettings={saveSettings}
            onSettingsSaved={onSettingsSaved}
            onLog={onLog}
          />

          {/* Browser mode section */}
          <BrowserModeSection
            headless={settings.headless ?? false}
            onHeadlessChange={updateHeadless}
          />

          {/* Browser configuration section */}
          <BrowserConfigSection
            browserChannel={settings.browserChannel as BrowserChannel}
            executablePath={settings.executablePath}
            profileDir={settings.profileDir}
            onBrowserChannelChange={updateBrowserChannel}
            onExecutablePathChange={updateExecutablePath}
          />

          {/* Authentication section */}
          <AuthenticationSection
            isSettingUpLogin={settingUpLogin}
            isLoading={loading}
            onSetupLogin={handleSetupLogin}
          />

          {/* Save button */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-sky-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="relative w-full h-11 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 transition-all duration-300"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-500" />
                ) : (
                  <Save className="w-4 h-4 mr-2 text-blue-500" />
                )}
                <span className="font-semibold tracking-wide">Save Configuration</span>
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 text-center leading-relaxed px-4">
              Changes apply to new browser instances.
              <br />
              Profiles update on next launch.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
