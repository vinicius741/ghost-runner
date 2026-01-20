import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
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
  const [cronTab, setCronTab] = useState('minutes');

  // Cron inputs
  const [minutes, setMinutes] = useState(15);
  const [hourlyMinute, setHourlyMinute] = useState(0);
  const [dailyTime, setDailyTime] = useState('12:00');
  const [cronPreview, setCronPreview] = useState('* * * * *');

  // One-time inputs
  const [delayHours, setDelayHours] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState(30);

  // Calculate the preview time for one-time tasks (computed on render to show current time)
  const executeAtTime = new Date(Date.now() + (delayHours * 3600000) + (delayMinutes * 60000)).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' }
  );

  useEffect(() => {
    let cron = '* * * * *';
    if (cronTab === 'minutes') {
      const m = Math.max(1, Math.min(59, minutes || 1));
      cron = `*/${m} * * * *`;
    } else if (cronTab === 'hourly') {
      const m = Math.max(0, Math.min(59, hourlyMinute || 0));
      cron = `${m} * * * *`;
    } else if (cronTab === 'daily') {
      const [h, m] = dailyTime.split(':');
      cron = `${parseInt(m)} ${parseInt(h)} * * *`;
    }
    setCronPreview(cron);
  }, [cronTab, minutes, hourlyMinute, dailyTime]);

  const handleAdd = () => {
    if (!selectedTask) return;

    if (cronTab === 'once') {
      const now = new Date();
      const executeAt = new Date(now.getTime() + (delayHours * 60 * 60 * 1000) + (delayMinutes * 60 * 1000));
      onAddSchedule(selectedTask, undefined, executeAt.toISOString());
    } else {
      onAddSchedule(selectedTask, cronPreview, undefined);
    }

    setSelectedTask('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="card-premium h-full">
        <CardHeader className="pb-4" onDoubleClick={onHeaderDoubleClick}>
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Schedule Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Select Automation</label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800/50 text-slate-100 h-11 focus:ring-blue-500/20">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {tasks.map(t => <SelectItem key={`${t.name}-${t.type}`} value={t.name} className="focus:bg-blue-500/10 focus:text-blue-200 uppercase text-xs font-semibold tracking-tight">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 space-y-4">
              <Tabs value={cronTab} onValueChange={setCronTab} className="w-full">
                <TabsList className="bg-slate-900/50 border border-slate-800/50 w-full p-1 h-11">
                  <TabsTrigger value="minutes" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Min</TabsTrigger>
                  <TabsTrigger value="hourly" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Hour</TabsTrigger>
                  <TabsTrigger value="daily" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Day</TabsTrigger>
                  <TabsTrigger value="once" className="text-xs uppercase font-bold tracking-tight data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">Once</TabsTrigger>
                </TabsList>

                <div className="pt-4 text-slate-300 min-h-[60px] flex items-center justify-center">
                  <TabsContent value="minutes" className="mt-0 w-full">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium">
                      <span>Every</span>
                      <Input
                        type="number"
                        min={1}
                        max={59}
                        value={minutes}
                        onChange={(e) => setMinutes(parseInt(e.target.value))}
                        className="w-20 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
                      />
                      <span>minutes</span>
                    </div>
                  </TabsContent>
                  <TabsContent value="hourly" className="mt-0 w-full">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium">
                      <span>Every hour at</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={hourlyMinute}
                        onChange={(e) => setHourlyMinute(parseInt(e.target.value))}
                        className="w-20 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
                      />
                      <span>past the hour</span>
                    </div>
                  </TabsContent>
                  <TabsContent value="daily" className="mt-0 w-full">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium">
                      <span>Daily at</span>
                      <Input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        className="w-32 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="once" className="mt-0 w-full">
                    <div className="flex items-center justify-center gap-3 text-sm font-medium">
                      <span>In</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          value={delayHours}
                          onChange={(e) => setDelayHours(parseInt(e.target.value) || 0)}
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
                          onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                          className="w-16 h-9 bg-slate-900 border-slate-800 text-center font-bold text-blue-400 focus:ring-blue-500/20"
                          placeholder="MM"
                        />
                        <span className="text-slate-500 text-xs">m</span>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

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
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-sky-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <Button
                onClick={handleAdd}
                className="relative w-full h-11 bg-slate-100 text-slate-950 hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:grayscale"
                disabled={!selectedTask}
              >
                <span className="font-bold uppercase tracking-widest text-xs">Add to Schedule</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Active Schedules</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {schedule.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-600 text-center py-8 border border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest">No active schedules</p>
                  </motion.div>
                ) : (
                  schedule.map((item, idx) => (
                    <motion.div
                      key={`${item.task}-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl hover:border-blue-500/30 transition-all duration-300"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{item.task}</span>
                        <div className="flex items-center gap-2">
                          {item.cron && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold font-mono rounded-md border border-blue-500/10">
                              <Calendar className="w-2.5 h-2.5" />
                              {item.cron}
                            </span>
                          )}
                          {item.executeAt && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono rounded-md border border-emerald-500/10">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(item.executeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteSchedule(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
