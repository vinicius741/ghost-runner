import type { CronTab } from "./types";

interface SchedulePreviewProps {
  cronTab: CronTab;
  cronPreview: string;
  executeAtTime: string;
}

export function SchedulePreview({ cronTab, cronPreview, executeAtTime }: SchedulePreviewProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-xs">
      <span className="text-faint">{cronTab === 'once' ? 'Runs at' : 'Cron'}</span>
      <span className="font-mono text-foreground tabular-nums">
        {cronTab === 'once' ? executeAtTime : cronPreview}
      </span>
    </div>
  );
}
