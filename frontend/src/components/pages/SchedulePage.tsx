import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { ScheduleBuilder } from '@/components/dashboard/ScheduleBuilder';
import { TaskCalendar } from '@/components/dashboard/TaskCalendar';

type ScheduleView = 'list' | 'calendar';

export function SchedulePage() {
  const { tasks, schedule, addScheduleItem, deleteScheduleItem } = useDashboard();
  const [view, setView] = useState<ScheduleView>('list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Recurring and one-time runs. The scheduler must be running for these to fire."
        actions={
          <SegmentedControl
            ariaLabel="Schedule view"
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' },
            ]}
          />
        }
      />

      {view === 'list' ? (
        <ScheduleBuilder
          tasks={tasks}
          schedule={schedule}
          onAddSchedule={addScheduleItem}
          onDeleteSchedule={deleteScheduleItem}
        />
      ) : (
        <TaskCalendar schedule={schedule} onDeleteSchedule={deleteScheduleItem} />
      )}
    </div>
  );
}
