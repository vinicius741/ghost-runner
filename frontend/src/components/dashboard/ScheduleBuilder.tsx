import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X } from 'lucide-react';

interface ScheduleItem {
  task: string;
  cron: string;
}

interface ScheduleBuilderProps {
  tasks: string[];
  schedule: ScheduleItem[];
  onAddSchedule: (task: string, cron: string) => void;
  onDeleteSchedule: (index: number) => void;
}

export function ScheduleBuilder({ tasks, schedule, onAddSchedule, onDeleteSchedule }: ScheduleBuilderProps) {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [cronTab, setCronTab] = useState('minutes');

  // Cron inputs
  const [minutes, setMinutes] = useState(15);
  const [hourlyMinute, setHourlyMinute] = useState(0);
  const [dailyTime, setDailyTime] = useState('12:00');
  const [cronPreview, setCronPreview] = useState('* * * * *');

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
    onAddSchedule(selectedTask, cronPreview);
    setSelectedTask('');
  };

  return (
    <Card className="bg-slate-900/50 backdrop-blur border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 font-normal">Schedule Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-100">
              <SelectValue placeholder="Select Task..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
              {tasks.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="bg-slate-950/30 border border-slate-700 rounded-lg p-4">
            <Tabs value={cronTab} onValueChange={setCronTab} className="w-full">
              <TabsList className="bg-slate-900/50 border border-slate-800 w-full justify-start">
                <TabsTrigger value="minutes">Minutes</TabsTrigger>
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
              </TabsList>

              <div className="py-4 text-slate-200">
                <TabsContent value="minutes" className="mt-0">
                  <div className="flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(parseInt(e.target.value))}
                      className="w-20 inline-block bg-slate-900 border-slate-700 text-center"
                    />
                    minutes
                  </div>
                </TabsContent>
                <TabsContent value="hourly" className="mt-0">
                  <div className="flex items-center gap-2">
                    Every hour at
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={hourlyMinute}
                      onChange={(e) => setHourlyMinute(parseInt(e.target.value))}
                      className="w-20 inline-block bg-slate-900 border-slate-700 text-center"
                    />
                    minutes past the hour
                  </div>
                </TabsContent>
                <TabsContent value="daily" className="mt-0">
                  <div className="flex items-center gap-2">
                    Every day at
                    <Input
                      type="time"
                      value={dailyTime}
                      onChange={(e) => setDailyTime(e.target.value)}
                      className="w-32 inline-block bg-slate-900 border-slate-700 text-center"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="pt-4 border-t border-slate-800 flex items-center gap-2 text-sm text-slate-400">
              <span>Preview:</span>
              <code className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono">{cronPreview}</code>
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!selectedTask}>
            Add to Schedule
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {schedule.length === 0 ? (
            <div className="text-slate-500 text-center py-2">No scheduled tasks.</div>
          ) : (
            schedule.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-slate-800 rounded-lg group">
                <div>
                  <span className="font-medium text-slate-200">{item.task}</span>
                  <span className="ml-3 inline-block bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-0.5 rounded">
                    {item.cron}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteSchedule(idx)}
                  className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
