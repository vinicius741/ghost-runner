import { useCallback, useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { NextTaskProvider } from '@/contexts/NextTaskContext';
import { Sidebar } from '@/components/shell/Sidebar';
import { getStoredPage, storePage, type PageId } from '@/components/shell/navigation';
import { CreateTaskModal } from './CreateTaskModal';
import { OverviewPage } from '@/components/pages/OverviewPage';
import { TasksPage } from '@/components/pages/TasksPage';
import { SchedulePage } from '@/components/pages/SchedulePage';
import { DataPage, FailuresPage, LogsPage, SettingsPage } from '@/components/pages/SimplePages';

/**
 * App shell: sidebar navigation plus the active page. Pages read state
 * straight from DashboardContext.
 */
export function DashboardContent() {
  const [page, setPage] = useState<PageId>(getStoredPage);
  const [recordOpen, setRecordOpen] = useState(false);
  const {
    tasks,
    schedule,
    failures,
    infoGatheringResults,
    schedulerStatus,
    startScheduler,
    stopScheduler,
    recordTask,
  } = useDashboard();

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    storePage(next);
    window.scrollTo({ top: 0 });
  }, []);

  const openRecord = useCallback(() => setRecordOpen(true), []);

  return (
    <NextTaskProvider schedulerRunning={schedulerStatus}>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar
          page={page}
          onNavigate={navigate}
          counts={{
            tasks: tasks.length,
            schedule: schedule.length,
            failures: failures.length,
            data: infoGatheringResults.length,
          }}
          schedulerRunning={schedulerStatus}
          onStartScheduler={startScheduler}
          onStopScheduler={stopScheduler}
        />

        <main className="min-w-0 lg:pl-56">
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {page === 'overview' && <OverviewPage onNavigate={navigate} onRecordTask={openRecord} />}
            {page === 'tasks' && <TasksPage onRecordTask={openRecord} />}
            {page === 'schedule' && <SchedulePage />}
            {page === 'failures' && <FailuresPage />}
            {page === 'data' && <DataPage />}
            {page === 'logs' && <LogsPage />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </main>

        <CreateTaskModal isOpen={recordOpen} onClose={() => setRecordOpen(false)} onRecord={recordTask} />
      </div>
    </NextTaskProvider>
  );
}
