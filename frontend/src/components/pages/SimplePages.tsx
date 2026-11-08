import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WarningsPanel } from '@/components/dashboard/WarningsPanel';
import { InfoGathering } from '@/components/dashboard/InfoGathering';
import { LogsConsole } from '@/components/dashboard/LogsConsole';
import { SettingsManager } from '@/components/dashboard/SettingsManager';
import { SettingsSection } from '@/components/dashboard/settings/components/SettingsSection';
import { UpdateButton } from '@/components/dashboard/UpdateButton';

export function FailuresPage() {
  const { failures, clearFailures, dismissFailure } = useDashboard();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Failures"
        description="Grouped by task. Open a failure for screenshots, logs, and a ready-made repair prompt."
      />
      <WarningsPanel failures={failures} onClearFailures={clearFailures} onDismissFailure={dismissFailure} />
    </div>
  );
}

export function DataPage() {
  const {
    infoGatheringResults,
    refreshingInfoGatheringTasks,
    refreshInfoGatheringTask,
    clearInfoGatheringResult,
    clearAllInfoGatheringResults,
  } = useDashboard();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data"
        description="Results returned by info-gathering tasks."
        actions={
          infoGatheringResults.length > 0 && (
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              Clear all
            </Button>
          )
        }
      />
      <InfoGathering
        results={infoGatheringResults}
        onRefreshTask={refreshInfoGatheringTask}
        onClearResult={clearInfoGatheringResult}
        refreshingTasks={refreshingInfoGatheringTasks}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all gathered data?"
        description="Every stored result is removed. Tasks will repopulate it the next time they run."
        confirmLabel="Clear all"
        onConfirm={clearAllInfoGatheringResults}
      />
    </div>
  );
}

export function LogsPage() {
  const { logs, clearLogs } = useDashboard();
  return (
    <div className="space-y-6">
      <PageHeader title="Logs" description="Everything from tasks, the scheduler, and the app in this session." />
      <LogsConsole
        title="Session log"
        logs={logs}
        onClearLogs={clearLogs}
        filterable
        bodyClassName="h-[calc(100vh-15rem)] min-h-[320px]"
      />
    </div>
  );
}

export function SettingsPage() {
  const { fetchSettings, addLog } = useDashboard();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" />
      <SettingsManager onSettingsSaved={fetchSettings} onLog={addLog} />
      {window.ghostRunnerDesktop && (
        <Card>
          <SettingsSection title="Updates" description="Desktop app updates are downloaded from GitHub releases.">
            <div className="max-w-xs">
              <UpdateButton />
            </div>
          </SettingsSection>
        </Card>
      )}
    </div>
  );
}
