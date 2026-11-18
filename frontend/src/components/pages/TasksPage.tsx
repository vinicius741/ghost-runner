import { useState } from 'react';
import { Circle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { TaskList } from '@/components/dashboard/TaskList';
import { LogsConsole } from '@/components/dashboard/LogsConsole';
import { ScheduleBuilder } from '@/components/dashboard/ScheduleBuilder';
import { ScheduleList } from '@/components/dashboard/schedule-builder';
import { TaskCalendar } from '@/components/dashboard/TaskCalendar';

type ScheduleView = 'list' | 'calendar';

/** Run tasks and schedule them from one page. */
export function TasksPage({ onRecordTask }: { onRecordTask: () => void }) {
  const {
    tasks,
    runningTasks,
    runTask,
    uploadTask,
    loadTaskSource,
    saveTaskSource,
    logs,
    clearLogs,
    schedule,
    addScheduleItem,
    deleteScheduleItem,
  } = useDashboard();
  const [scheduleView, setScheduleView] = useState<ScheduleView>('list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Run a task now or schedule one. Scheduled runs fire while the scheduler is running."
        actions={
          <Button onClick={onRecordTask}>
            <Circle className="fill-current" />
            Record task
          </Button>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TaskList
          tasks={tasks}
          runningTasks={runningTasks}
          onRunTask={runTask}
          onUploadTask={uploadTask}
          onLoadTaskSource={loadTaskSource}
          onSaveTaskSource={saveTaskSource}
        />
        <ScheduleBuilder
          tasks={tasks}
          schedule={schedule}
          onAddSchedule={addScheduleItem}
          onDeleteSchedule={deleteScheduleItem}
          showList={false}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-3" aria-label="Scheduled runs">
          <SegmentedControl
            ariaLabel="Schedule view"
            size="sm"
            value={scheduleView}
            onChange={setScheduleView}
            options={[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' },
            ]}
          />
          {scheduleView === 'list' ? (
            <ScheduleList schedule={schedule} onDeleteSchedule={deleteScheduleItem} />
          ) : (
            <TaskCalendar schedule={schedule} onDeleteSchedule={deleteScheduleItem} />
          )}
        </section>
        <LogsConsole
          title="Output"
          logs={logs}
          onClearLogs={clearLogs}
          limit={300}
          className="xl:mt-9"
          bodyClassName="h-[320px]"
        />
      </div>
    </div>
  );
}
