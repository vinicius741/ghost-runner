import { useState, useEffect, useCallback } from 'react';
import { Header } from "@/components/dashboard/Header";
import { TaskCalendar } from "@/components/dashboard/TaskCalendar";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { LocationWarning } from "@/components/dashboard/LocationWarning";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Task, LogEntry, ScheduleItem, Settings, DashboardCardId, DashboardLayout, DashboardColumn, FailureRecord } from '@/types';
import { DEFAULT_LOCATION } from '@/types';
import { getStoredLayout, saveLayout } from '@/lib/dashboardLayout';

const socket = io();

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout>(() => getStoredLayout());
  const [failures, setFailures] = useState<FailureRecord[]>([]);

  const addLog = useCallback((message: string, type: 'normal' | 'error' | 'system' = 'normal') => {
    setLogs(prev => [...prev, {
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    }]);
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      addLog('Error fetching tasks', 'error');
    }
  }, [addLog]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch {
      addLog('Error fetching schedule', 'error');
    }
  }, [addLog]);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const data = await res.json();
      setSchedulerStatus(data.running);
    } catch {
      // Quiet fail or log
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings && data.settings.geolocation) {
        setSettings(data.settings);
      }
    } catch (error) {
      addLog('Error fetching settings', 'error');
      console.error('Error fetching settings:', error);
    }
  }, [addLog]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch('/api/failures');
      const data = await res.json();
      setFailures(data.failures || []);
    } catch (error) {
      addLog('Error fetching failures', 'error');
      console.error('Error fetching failures:', error);
    }
  }, [addLog]);

  useEffect(() => {
    fetchTasks();
    fetchSchedule();
    fetchSchedulerStatus();
    fetchSettings();
    fetchFailures();

    socket.on('log', (message: string) => {
      addLog(message);
    });

    socket.on('scheduler-status', (status: boolean) => {
      setSchedulerStatus(status);
    });

    socket.on('failure-recorded', (failure: FailureRecord) => {
      setFailures(prev => [...prev, failure]);
      addLog(`Task failure recorded: ${failure.taskName}`, 'error');
    });

    socket.on('failures-cleared', () => {
      setFailures([]);
      addLog('All failures cleared', 'system');
    });

    socket.on('failure-dismissed', (id: string) => {
      setFailures(prev => prev.filter(f => f.id !== id));
    });

    return () => {
      socket.off('log');
      socket.off('scheduler-status');
      socket.off('failure-recorded');
      socket.off('failures-cleared');
      socket.off('failure-dismissed');
    };
  }, [addLog, fetchTasks, fetchSchedule, fetchSchedulerStatus, fetchSettings, fetchFailures]);

  const handleStartScheduler = async () => {
    addLog('Starting Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/start', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting scheduler: ${message}`, 'error');
    }
  };

  const handleStopScheduler = async () => {
    addLog('Stopping Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/stop', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error stopping scheduler: ${message}`, 'error');
    }
  };

  const handleRecordTask = async (taskName: string, type: 'private' | 'public') => {
    addLog(`Starting Recorder for task: ${taskName} (${type})...`, 'system');
    try {
      await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName, type })
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting recorder: ${message}`, 'error');
    }
  };

  const handleRunTask = async (taskName: string) => {
    addLog(`Requesting to run task: ${taskName}...`, 'system');
    try {
      await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName })
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error starting task: ${message}`, 'error');
    }
  };

  const handleAddSchedule = async (task: string, cron?: string, executeAt?: string) => {
    const newItem: ScheduleItem = { task };
    if (cron) newItem.cron = cron;
    if (executeAt) newItem.executeAt = executeAt;

    const newSchedule = [...schedule, newItem];
    setSchedule(newSchedule);
    await saveSchedule(newSchedule);
  };

  const handleDeleteSchedule = async (index: number) => {
    const newSchedule = [...schedule];
    newSchedule.splice(index, 1);
    setSchedule(newSchedule);
    await saveSchedule(newSchedule);
  };

  const saveSchedule = async (newSchedule: ScheduleItem[]) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: newSchedule })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addLog('Schedule updated successfully.', 'system');
    } catch (error) {
      console.error('Error saving schedule:', error);
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error saving schedule: ${message}`, 'error');
    }
  };

  const handleClearFailures = async () => {
    try {
      const res = await fetch('/api/failures', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures([]);
      addLog('All failures cleared', 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing failures: ${message}`, 'error');
    }
  };

  const handleDismissFailure = async (id: string) => {
    try {
      const res = await fetch(`/api/failures/${id}/dismiss`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFailures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error dismissing failure: ${message}`, 'error');
    }
  };

  const handleCardReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as DashboardCardId;
    const overId = over.id as DashboardCardId;

    setLayout((currentLayout) => {
      // Find which column the active card is in
      const activeColumn: DashboardColumn = currentLayout.left.includes(activeId) ? 'left' : 'right';
      // Find which column the target card is in
      const overColumn: DashboardColumn = currentLayout.left.includes(overId) ? 'left' : 'right';

      // Get the source and target arrays
      const sourceArray = currentLayout[activeColumn];
      const targetArray = currentLayout[overColumn];

      const oldIndex = sourceArray.indexOf(activeId);
      const newIndex = targetArray.indexOf(overId);

      let newLayout: DashboardLayout;

      if (activeColumn === overColumn) {
        // Moving within the same column
        const newArray = arrayMove(sourceArray, oldIndex, newIndex);
        newLayout = {
          ...currentLayout,
          [activeColumn]: newArray
        };
      } else {
        // Moving between columns
        const newSourceArray = [...sourceArray];
        const newTargetArray = [...targetArray];

        // Remove from source
        newSourceArray.splice(oldIndex, 1);
        // Insert in target
        newTargetArray.splice(newIndex, 0, activeId);

        newLayout = {
          ...currentLayout,
          [activeColumn]: newSourceArray,
          [overColumn]: newTargetArray
        };
      }

      saveLayout(newLayout);
      return newLayout;
    });
  };

  const isUsingDefaultLocation = settings?.geolocation &&
    settings.geolocation.latitude === DEFAULT_LOCATION.latitude &&
    settings.geolocation.longitude === DEFAULT_LOCATION.longitude;

  const showLocationWarning = isUsingDefaultLocation && !locationWarningDismissed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />

      <div className="max-w-7xl mx-auto space-y-10 relative">
        <Header />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 h-14 p-1.5 gap-1.5 rounded-2xl shadow-2xl shadow-black/20">
              <TabsTrigger
                value="dashboard"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 hover:text-slate-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 hover:text-slate-200"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Calendar</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 hover:text-slate-200"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <TabsContent value="dashboard" className="mt-0 space-y-8">
                <AnimatePresence>
                  {showLocationWarning && (
                    <LocationWarning
                      onDismiss={() => setLocationWarningDismissed(true)}
                      onGoToSettings={() => setActiveTab('settings')}
                    />
                  )}
                </AnimatePresence>
                <DashboardGrid
                  layout={layout}
                  onDragEnd={handleCardReorder}
                  onStartScheduler={handleStartScheduler}
                  onStopScheduler={handleStopScheduler}
                  onRecordTask={handleRecordTask}
                  schedulerStatus={schedulerStatus}
                  tasks={tasks}
                  schedule={schedule}
                  onAddSchedule={handleAddSchedule}
                  onDeleteSchedule={(index) => {
                    if (confirm('Are you sure you want to delete this schedule?')) {
                      handleDeleteSchedule(index);
                    }
                  }}
                  onRunTask={handleRunTask}
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                  failures={failures}
                  onClearFailures={handleClearFailures}
                  onDismissFailure={handleDismissFailure}
                />
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <div className="card-premium p-6 rounded-3xl bg-slate-900/30">
                  <TaskCalendar schedule={schedule} onDeleteSchedule={handleDeleteSchedule} />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="max-w-3xl mx-auto py-4">
                  <SettingsManager onSettingsSaved={fetchSettings} onLog={addLog} />
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

export default App;

