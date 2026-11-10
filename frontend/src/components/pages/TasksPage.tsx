import { Circle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { TaskList } from '@/components/dashboard/TaskList';
import { LogsConsole } from '@/components/dashboard/LogsConsole';
import { followUpExecuteAt, formatDelay, type FollowUp } from '@/lib/followUp';
import { formatDayTime } from '@/lib/schedule';

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
    addLog,
    schedule,
    schedulerStatus,
    addScheduleItem,
    startScheduler,
  } = useDashboard();

  const runWithFollowUp = async (taskName: string, followUp: FollowUp, runNow: boolean) => {
    if (runNow) void runTask(taskName);
    const executeAt = followUpExecuteAt(followUp.delayMinutes);
    await addScheduleItem(followUp.task, undefined, executeAt.toISOString());
    addLog(
      `Follow-up queued: ${followUp.task} in ${formatDelay(followUp.delayMinutes)} (${formatDayTime(executeAt)}).`,
      'system'
    );
    // A one-time run only fires while the scheduler is running.
    if (!schedulerStatus) await startScheduler();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Click a task to run it. The alarm clock runs it and queues a follow-up."
        actions={
          <Button onClick={onRecordTask}>
            <Circle className="fill-current" />
            Record task
          </Button>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <TaskList
          tasks={tasks}
          runningTasks={runningTasks}
          onRunTask={runTask}
          onUploadTask={uploadTask}
          onLoadTaskSource={loadTaskSource}
          onSaveTaskSource={saveTaskSource}
          onRunWithFollowUp={(taskName, followUp, runNow) => void runWithFollowUp(taskName, followUp, runNow)}
          schedule={schedule}
          schedulerRunning={schedulerStatus}
        />
        <LogsConsole
          title="Output"
          logs={logs}
          onClearLogs={clearLogs}
          limit={300}
          className="xl:sticky xl:top-8"
          bodyClassName="h-[360px] xl:h-[calc(100vh-11rem)] xl:max-h-[720px]"
        />
      </div>
    </div>
  );
}
