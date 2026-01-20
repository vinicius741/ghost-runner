import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import CronExpressionParser from 'cron-parser';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

interface TaskCalendarProps {
  schedule: ScheduleItem[];
  onDeleteSchedule: (index: number) => void;
}

interface CalendarEvent {
  id: string; // "index-timestamp" to be unique for occurrences
  title: string;
  start: Date;
  end: Date;
  originalIndex: number;
  isCron: boolean;
}

export function TaskCalendar({ schedule, onDeleteSchedule }: TaskCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = useMemo(() => {
    const generatedEvents: CalendarEvent[] = [];

    // Determine the range to generate events for
    // For simplicity, we generate for the current month/week +/- 1 month to handle navigation
    // Better approach: generate for the currently visible range based on 'date' and 'view'
    // But react-big-calendar doesn't pass the range to props easily unless we use onRangeChange.
    // Let's generate for current year to be safe, or just 3 months around 'date'.

    const startRange = new Date(date);
    startRange.setMonth(startRange.getMonth() - 1);
    startRange.setDate(1);

    const endRange = new Date(date);
    endRange.setMonth(endRange.getMonth() + 2);
    endRange.setDate(0);

    schedule.forEach((item, index) => {
      if (item.executeAt) {
        const d = new Date(item.executeAt);
        generatedEvents.push({
          id: `${index}-once`,
          title: item.task,
          start: d,
          end: new Date(d.getTime() + 30 * 60 * 1000), // Default 30 min duration
          originalIndex: index,
          isCron: false
        });
      } else if (item.cron) {
        try {
          const options = {
            currentDate: startRange,
            endDate: endRange,
            iterator: true
          };
          const interval = CronExpressionParser.parse(item.cron, options);

          while (true) {
            try {
              const obj = interval.next();
              const d = obj.toDate();
              generatedEvents.push({
                id: `${index}-${d.getTime()}`,
                title: `${item.task} (Cron)`,
                start: d,
                end: new Date(d.getTime() + 30 * 60 * 1000),
                originalIndex: index,
                isCron: true
              });
            } catch {
              break;
            }
          }
        } catch {
          console.error(`Invalid cron: ${item.cron}`);
        }
      }
    });

    return generatedEvents;
  }, [schedule, date]); // Re-generate when schedule changes or main date changes (navigation)

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleConfirmDelete = () => {
    if (selectedEvent) {
      onDeleteSchedule(selectedEvent.originalIndex);
      setSelectedEvent(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="h-full"
    >
      <Card className="card-premium h-[700px] flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="h-full bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'day']}
              className="text-slate-100 dark-calendar"
            />
          </div>
        </CardContent>

        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Delete Task Execution?</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm mt-2">
                {selectedEvent?.isCron
                  ? "This is a recurring task. Deleting it will remove the schedule configuration and stop all future executions."
                  : "This is a one-time task. Deleting it will cancel the execution."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Task</span>
                <span className="text-sm font-semibold text-slate-200">{selectedEvent?.title}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Scheduled Time</span>
                <span className="text-sm font-semibold text-slate-200">{selectedEvent?.start.toLocaleString()}</span>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedEvent(null)}
                className="flex-1 bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300"
              >
                Keep Task
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300"
              >
                Delete Execution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </motion.div>
  );
}
