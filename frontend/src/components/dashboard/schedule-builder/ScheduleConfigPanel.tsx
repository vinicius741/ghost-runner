import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import type { CronTab, ScheduleConfigState } from "./types";

interface ScheduleConfigPanelProps {
  cronTab: CronTab;
  onTabChange: (tab: CronTab) => void;
  config: ScheduleConfigState;
  onConfigChange: (config: Partial<ScheduleConfigState>) => void;
  children?: ReactNode;
}

const numberInput = "h-8 w-16 text-center tabular-nums";

export function ScheduleConfigPanel({ cronTab, onTabChange, config, onConfigChange, children }: ScheduleConfigPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label id="schedule-mode-label">Repeat</Label>
        <SegmentedControl
          ariaLabelledBy="schedule-mode-label"
          className="flex w-full"
          value={cronTab}
          onChange={onTabChange}
          options={[
            { value: 'once', label: 'Once' },
            { value: 'minutes', label: 'Interval' },
            { value: 'hourly', label: 'Hourly' },
            { value: 'daily', label: 'Daily' },
          ]}
        />
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        {cronTab === 'once' && (
          <>
            <span>Run in</span>
            <Input
              type="number"
              min={0}
              value={config.delayHours}
              onChange={(e) => onConfigChange({ delayHours: parseInt(e.target.value) || 0 })}
              className={numberInput}
              placeholder="HH"
              aria-label="Hours from now"
            />
            <span>h</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={config.delayMinutes}
              onChange={(e) => onConfigChange({ delayMinutes: parseInt(e.target.value) || 0 })}
              className={numberInput}
              placeholder="MM"
              aria-label="Minutes from now"
            />
            <span>m</span>
          </>
        )}

        {cronTab === 'minutes' && (
          <>
            <span>Every</span>
            <Input
              type="number"
              min={1}
              max={59}
              value={config.minutes}
              onChange={(e) => onConfigChange({ minutes: parseInt(e.target.value) })}
              className={numberInput}
              aria-label="Interval in minutes"
            />
            <span>minutes</span>
          </>
        )}

        {cronTab === 'hourly' && (
          <>
            <span>Every hour at minute</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={config.hourlyMinute}
              onChange={(e) => onConfigChange({ hourlyMinute: parseInt(e.target.value) })}
              className={numberInput}
              aria-label="Minute past the hour"
            />
          </>
        )}

        {cronTab === 'daily' && (
          <>
            <span>Every day at</span>
            <Input
              type="time"
              value={config.dailyTime}
              onChange={(e) => onConfigChange({ dailyTime: e.target.value })}
              className="h-8 w-[110px] tabular-nums [color-scheme:dark]"
              aria-label="Time of day"
            />
          </>
        )}
      </div>

      {children}
    </div>
  );
}
