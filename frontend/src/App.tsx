import { useState, useEffect } from 'react';
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
import type { Task, LogEntry, ScheduleItem, Settings, DashboardCardId, DashboardLayout, DashboardColumn } from '@/types';
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

  const addLog = (message: string, type: 'normal' | 'error' | 'system' = 'normal') => {
    setLogs(prev => [...prev, {
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    }]);
  };

  useEffect(() => {
    fetchTasks();
    fetchSchedule();
    fetchSchedulerStatus();
    fetchSettings();

    socket.on('log', (message: string) => {
      addLog(message);
    });

    socket.on('scheduler-status', (status: boolean) => {
      setSchedulerStatus(status);
    });

    return () => {
      socket.off('log');
      socket.off('scheduler-status');
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      addLog('Error fetching tasks', 'error');
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch (e) {
      addLog('Error fetching schedule', 'error');
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const data = await res.json();
      setSchedulerStatus(data.running);
    } catch (e) {
      // Quiet fail or log
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings && data.settings.geolocation) {
        setSettings(data.settings);
      }
    } catch (e) {
      addLog('Error fetching settings', 'error');
      console.error('Error fetching settings:', e);
    }
  };

  const handleStartScheduler = async () => {
    addLog('Starting Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/start', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error: any) {
      addLog(`Error starting scheduler: ${error.message}`, 'error');
    }
  };

  const handleStopScheduler = async () => {
    addLog('Stopping Scheduler...', 'system');
    try {
      const res = await fetch('/api/scheduler/stop', { method: 'POST' });
      const data = await res.json();
      addLog(data.message, 'system');
    } catch (error: any) {
      addLog(`Error stopping scheduler: ${error.message}`, 'error');
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
    } catch (error: any) {
      addLog(`Error starting recorder: ${error.message}`, 'error');
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
    } catch (error: any) {
      addLog(`Error starting task: ${error.message}`, 'error');
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
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      addLog(`Error saving schedule: ${error.message}`, 'error');
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

