import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CronExpressionParser } from 'cron-parser';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { isSameSchedule } from '@/lib/schedule';

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
  taskName: string;
  start: Date;
  end: Date;
  /** The schedule entry this occurrence came from (matched again on delete). */
  source: ScheduleItem;
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
          taskName: item.task,
          start: d,
          end: new Date(d.getTime() + 30 * 60 * 1000), // Default 30 min duration
          source: item,
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
                title: item.task,
                taskName: item.task,
                start: d,
                end: new Date(d.getTime() + 30 * 60 * 1000),
                source: item,
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
      const index = schedule.findIndex((entry) => isSameSchedule(entry, selectedEvent.source));
      if (index !== -1) onDeleteSchedule(index);
      setSelectedEvent(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="h-[680px]">
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
          popup
          className="noir-calendar"
        />
      </div>

      <ConfirmDialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        title={selectedEvent?.isCron ? 'Delete recurring schedule?' : 'Cancel this run?'}
        description={
          selectedEvent?.isCron
            ? 'This removes the whole schedule, so every future run stops.'
            : 'This one-time run will be cancelled.'
        }
        cancelLabel="Keep"
        confirmLabel={selectedEvent?.isCron ? 'Delete schedule' : 'Cancel run'}
        onConfirm={handleConfirmDelete}
      >
        {selectedEvent && (
          <dl className="space-y-1 rounded-md bg-background px-3 py-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-faint">Task</dt>
              <dd className="font-medium text-foreground">{selectedEvent.taskName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-faint">Scheduled</dt>
              <dd className="text-foreground tabular-nums">{selectedEvent.start.toLocaleString()}</dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>
    </Card>
  );
}
