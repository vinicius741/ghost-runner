/**
 * Authentication Section Component for Settings Manager
 *
 * Manages session setup and authentication settings.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.5
 */

import { Button } from '@/components/ui/button';
import { Lock as LockIcon, RefreshCw } from 'lucide-react';

export interface AuthenticationSectionProps {
  /** Whether login setup is in progress */
  isSettingUpLogin: boolean;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Callback to start login setup */
  onSetupLogin: () => void;
}

/**
 * Authentication section with login setup button.
 *
 * @example
 * <AuthenticationSection
 *   isSettingUpLogin={isSettingUpLogin}
 *   isLoading={isLoading}
 *   onSetupLogin={handleSetupLogin}
 *   onLog={logMessage}
 * />
 */
export function AuthenticationSection({
  isSettingUpLogin,
  isLoading,
  onSetupLogin,
}: AuthenticationSectionProps) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
      <div className="flex items-center gap-2 mb-2">
        <LockIcon className="w-4 h-4 text-amber-500" />
        <h3 className="text-slate-100 font-medium tracking-tight">Authentication</h3>
      </div>

      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
        Session Management
      </p>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        <Button
          onClick={onSetupLogin}
          disabled={isSettingUpLogin || isLoading}
          className="relative w-full h-11 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 transition-all duration-300"
        >
          {isSettingUpLogin ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-amber-500" />
          ) : (
            <LockIcon className="w-4 h-4 mr-2 text-amber-500" />
          )}
          <span className="font-semibold tracking-wide">Setup Google Login</span>
        </Button>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        This will launch a browser for manual login.
        The session will be saved for all automation tasks.
      </p>
    </div>
  );
}
