import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import {
  TaskSelector,
  ScheduleConfigPanel,
  SchedulePreview,
  ScheduleList,
  type Task,
  type ScheduleItem,
  type CronTab,
  type ScheduleConfigState,
} from './schedule-builder';

export interface NormalizedOnceDelay {
  delayHours: number;
  delayMinutes: number;
}

function sanitizeDelayPart(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function normalizeOnceDelay(hours: number, minutes: number): NormalizedOnceDelay {
  const safeHours = sanitizeDelayPart(hours);
  const safeMinutes = sanitizeDelayPart(minutes);
  const additionalHours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  return {
    delayHours: safeHours + additionalHours,
    delayMinutes: remainingMinutes,
  };
}

interface ScheduleBuilderProps {
  tasks: Task[];
  schedule: ScheduleItem[];
  onAddSchedule: (task: string, cron?: string, executeAt?: string) => void;
  onDeleteSchedule: (index: number) => void;
  onHeaderDoubleClick?: () => void;
}

export function ScheduleBuilder({ tasks, schedule, onAddSchedule, onDeleteSchedule, onHeaderDoubleClick }: ScheduleBuilderProps) {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [cronTab, setCronTab] = useState<CronTab>('once');

  // Schedule configuration state
  const [config, setConfig] = useState<ScheduleConfigState>({
    // Cron inputs
    minutes: 15,
    hourlyMinute: 0,
    dailyTime: '12:00',
    // One-time inputs
    delayHours: 1,
    delayMinutes: 0,
  });

  const [cronPreview, setCronPreview] = useState('* * * * *');

  // Calculate the preview time for one-time tasks
  /* eslint-disable react-hooks/purity */
  const executeAtTime = useMemo(() => {
    const normalizedDelay = normalizeOnceDelay(config.delayHours, config.delayMinutes);
    const now = Date.now();
    return new Date(now + (normalizedDelay.delayHours * 3600000) + (normalizedDelay.delayMinutes * 60000)).toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit' }
    );
  }, [config.delayHours, config.delayMinutes]);
  /* eslint-enable react-hooks/purity */

  // Update cron preview based on selected tab and inputs
  useEffect(() => {
    let cron = '* * * * *';
    if (cronTab === 'minutes') {
      const m = Math.max(1, Math.min(59, config.minutes || 1));
      cron = `*/${m} * * * *`;
    } else if (cronTab === 'hourly') {
      const m = Math.max(0, Math.min(59, config.hourlyMinute || 0));
      cron = `${m} * * * *`;
    } else if (cronTab === 'daily') {
      const [h, m] = config.dailyTime.split(':');
      cron = `${parseInt(m)} ${parseInt(h)} * * *`;
    }
    setCronPreview(cron);
  }, [cronTab, config.minutes, config.hourlyMinute, config.dailyTime]);

  const handleAdd = () => {
    if (!selectedTask) return;

    if (cronTab === 'once') {
      const normalizedDelay = normalizeOnceDelay(config.delayHours, config.delayMinutes);
      const now = new Date();
      const executeAt = new Date(
        now.getTime() + (normalizedDelay.delayHours * 60 * 60 * 1000) + (normalizedDelay.delayMinutes * 60 * 1000)
      );
      onAddSchedule(selectedTask, undefined, executeAt.toISOString());
    } else {
      onAddSchedule(selectedTask, cronPreview, undefined);
    }

    setSelectedTask('');
  };

  const handleConfigChange = (updates: Partial<ScheduleConfigState>) => {
    setConfig(prev => {
      const merged = { ...prev, ...updates };
      if ('delayHours' in updates || 'delayMinutes' in updates) {
        return {
          ...merged,
          ...normalizeOnceDelay(merged.delayHours, merged.delayMinutes),
        };
      }
      return merged;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="card-premium h-full">
        <CardHeader className="pb-4" onDoubleClick={onHeaderDoubleClick}>
          <CardTitle className="text-foreground font-medium tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: 'var(--glow-primary)' }} />
            Schedule Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 mb-8">
            <TaskSelector
              tasks={tasks}
              selectedTask={selectedTask}
              onTaskChange={setSelectedTask}
            />

            <ScheduleConfigPanel
              cronTab={cronTab}
              onTabChange={setCronTab}
              config={config}
              onConfigChange={handleConfigChange}
            >
              <SchedulePreview
                cronTab={cronTab}
                cronPreview={cronPreview}
                executeAtTime={executeAtTime}
              />
            </ScheduleConfigPanel>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <Button
                onClick={handleAdd}
                className="relative w-full h-11 bg-primary-foreground text-primary hover:bg-white transition-all duration-300 shadow-[0-0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:grayscale"
                disabled={!selectedTask}
              >
                <span className="font-bold uppercase tracking-widest text-xs">Add to Schedule</span>
              </Button>
            </div>
          </div>

          <ScheduleList
            schedule={schedule}
            onDeleteSchedule={onDeleteSchedule}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
