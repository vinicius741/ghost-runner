import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CronTab, ScheduleConfigState } from "./types";

interface ScheduleConfigPanelProps {
  cronTab: CronTab;
  onTabChange: (tab: CronTab) => void;
  config: ScheduleConfigState;
  onConfigChange: (config: Partial<ScheduleConfigState>) => void;
  children?: React.ReactNode;
}

export function ScheduleConfigPanel({ cronTab, onTabChange, config, onConfigChange, children }: ScheduleConfigPanelProps) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 space-y-4">
      <Tabs value={cronTab} onValueChange={(v) => onTabChange(v as CronTab)} className="w-full">
        <TabsList className="bg-slate-900/50 border border-slate-800/50 w-full p-1 h-11">
          <TabsTrigger value="once" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Once</TabsTrigger>
          <TabsTrigger value="minutes" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Min</TabsTrigger>
          <TabsTrigger value="hourly" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Hour</TabsTrigger>
          <TabsTrigger value="daily" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Day</TabsTrigger>
        </TabsList>

        <div className="pt-4 text-slate-300 min-h-[60px] flex items-center justify-center">
          <TabsContent value="once" className="mt-0 w-full">
            <OnceTabContent
              delayHours={config.delayHours}
              delayMinutes={config.delayMinutes}
              onDelayHoursChange={(v) => onConfigChange({ delayHours: v })}
              onDelayMinutesChange={(v) => onConfigChange({ delayMinutes: v })}
            />
          </TabsContent>
          <TabsContent value="minutes" className="mt-0 w-full">
            <MinutesTabContent
              minutes={config.minutes}
              onMinutesChange={(v) => onConfigChange({ minutes: v })}
            />
          </TabsContent>
          <TabsContent value="hourly" className="mt-0 w-full">
            <HourlyTabContent
              hourlyMinute={config.hourlyMinute}
              onHourlyMinuteChange={(v) => onConfigChange({ hourlyMinute: v })}
            />
          </TabsContent>
          <TabsContent value="daily" className="mt-0 w-full">
            <DailyTabContent
              dailyTime={config.dailyTime}
              onDailyTimeChange={(v) => onConfigChange({ dailyTime: v })}
            />
          </TabsContent>
        </div>
      </Tabs>
      {children}
    </div>
  );
}

// Tab content components

function OnceTabContent({
  delayHours,
  delayMinutes,
  onDelayHoursChange,
  onDelayMinutesChange,
}: {
  delayHours: number;
  delayMinutes: number;
  onDelayHoursChange: (value: number) => void;
  onDelayMinutesChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-medium">
      <span>In</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          value={delayHours}
          onChange={(e) => onDelayHoursChange(parseInt(e.target.value) || 0)}
          className="w-16 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
          placeholder="HH"
        />
        <span className="text-slate-500 text-xs">h</span>
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={59}
          value={delayMinutes}
          onChange={(e) => onDelayMinutesChange(parseInt(e.target.value) || 0)}
          className="w-16 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
          placeholder="MM"
        />
        <span className="text-slate-500 text-xs">m</span>
      </div>
    </div>
  );
}

function MinutesTabContent({
  minutes,
  onMinutesChange,
}: {
  minutes: number;
  onMinutesChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-medium">
      <span>Every</span>
      <Input
        type="number"
        min={1}
        max={59}
        value={minutes}
        onChange={(e) => onMinutesChange(parseInt(e.target.value))}
        className="w-20 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
      />
      <span>minutes</span>
    </div>
  );
}

function HourlyTabContent({
  hourlyMinute,
  onHourlyMinuteChange,
}: {
  hourlyMinute: number;
  onHourlyMinuteChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-medium">
      <span>Every hour at</span>
      <Input
        type="number"
        min={0}
        max={59}
        value={hourlyMinute}
        onChange={(e) => onHourlyMinuteChange(parseInt(e.target.value))}
        className="w-20 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
      />
      <span>past the hour</span>
    </div>
  );
}

function DailyTabContent({
  dailyTime,
  onDailyTimeChange,
}: {
  dailyTime: string;
  onDailyTimeChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-medium">
      <span>Daily at</span>
      <Input
        type="time"
        value={dailyTime}
        onChange={(e) => onDailyTimeChange(e.target.value)}
        className="w-32 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
      />
    </div>
  );
}
