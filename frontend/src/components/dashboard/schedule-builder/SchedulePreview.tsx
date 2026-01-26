import { Calendar, Clock } from 'lucide-react';
import type { CronTab } from "./types";

interface SchedulePreviewProps {
  cronTab: CronTab;
  cronPreview: string;
  executeAtTime: string;
}

export function SchedulePreview({ cronTab, cronPreview, executeAtTime }: SchedulePreviewProps) {
  return (
    <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between px-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preview Execution</span>
      {cronTab === 'once' ? (
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
          <Clock className="w-3 h-3" />
          {executeAtTime}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
          <Calendar className="w-3 h-3" />
          {cronPreview}
        </div>
      )}
    </div>
  );
}
