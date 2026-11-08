import { Circle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { TaskList } from '@/components/dashboard/TaskList';
import { LogsConsole } from '@/components/dashboard/LogsConsole';

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
  } = useDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Click a task to run it. Output streams alongside."
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
