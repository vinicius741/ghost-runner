/**
 * Session setup: launches a browser for a one-time manual login whose
 * cookies are reused by every automation.
 */

import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { SettingsSection } from '../components/SettingsSection';

export interface AuthenticationSectionProps {
  isSettingUpLogin: boolean;
  isLoading: boolean;
  onSetupLogin: () => void;
}

export function AuthenticationSection({
  isSettingUpLogin,
  isLoading,
  onSetupLogin,
}: AuthenticationSectionProps) {
  return (
    <SettingsSection
      title="Session"
      description="Opens a browser so you can sign in by hand. The session is saved and reused by all tasks."
    >
      <Button variant="secondary" onClick={onSetupLogin} disabled={isSettingUpLogin || isLoading}>
        {isSettingUpLogin ? <Loader2 className="animate-spin" /> : <LogIn />}
        Set up Google login
      </Button>
    </SettingsSection>
  );
}
