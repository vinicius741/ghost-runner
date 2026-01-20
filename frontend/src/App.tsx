import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from "@/components/dashboard/Header";
import { TaskCalendar } from "@/components/dashboard/TaskCalendar";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { LocationWarning } from "@/components/dashboard/LocationWarning";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { MinimizedCardsSidebar } from "@/components/dashboard/MinimizedCardsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Task, LogEntry, ScheduleItem, Settings, DashboardCardId, DashboardLayoutExtended, DashboardColumn, FailureRecord, MinimizedCard, InfoGatheringResult } from '@/types';
import type { StoredLayoutResult } from '@/lib/dashboardLayout';
import { DEFAULT_LOCATION } from '@/types';
import { getStoredLayout, saveLayout, getSidebarState, saveSidebarState } from '@/lib/dashboardLayout';

const socket = io();

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);
  // Initialize layout and handle migration message
  const initialLayoutResult: StoredLayoutResult = getStoredLayout();
  const [layout, setLayout] = useState<DashboardLayoutExtended>(() => initialLayoutResult.layout);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => getSidebarState());
  const [failures, setFailures] = useState<FailureRecord[]>([]);
  const [infoGatheringResults, setInfoGatheringResults] = useState<InfoGatheringResult[]>([]);
  const [refreshingInfoGatheringTasks, setRefreshingInfoGatheringTasks] = useState<string[]>([]);
  // Track if migration message has been shown
  const migrationMessageShownRef = useRef(false);

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

  const fetchInfoGathering = useCallback(async () => {
    try {
      const res = await fetch('/api/info-gathering');
      const data = await res.json();
      setInfoGatheringResults(data.results || []);
    } catch (error) {
      addLog('Error fetching info-gathering data', 'error');
      console.error('Error fetching info-gathering data:', error);
    }
  }, [addLog]);

  useEffect(() => {
    // Show migration message if one exists (only once on mount)
    if (!migrationMessageShownRef.current && initialLayoutResult.migrationMessage) {
      addLog(initialLayoutResult.migrationMessage, 'system');
      migrationMessageShownRef.current = true;
    }

    fetchTasks();
    fetchSchedule();
    fetchSchedulerStatus();
    fetchSettings();
    fetchFailures();
    fetchInfoGathering();

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

    socket.on('info-gathering-result-updated', (result: InfoGatheringResult) => {
      setInfoGatheringResults(prev => {
        const existing = prev.findIndex(r => r.taskName === result.taskName);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = result;
          return updated;
        }
        return [...prev, result];
      });
      addLog(`Information updated: ${result.displayName}`, 'system');
    });

    socket.on('info-gathering-result-cleared', ({ taskName }: { taskName: string }) => {
      setInfoGatheringResults(prev => prev.filter(r => r.taskName !== taskName));
      addLog(`Information cleared: ${taskName}`, 'system');
    });

    socket.on('info-gathering-all-cleared', () => {
      setInfoGatheringResults([]);
      addLog('All information cleared', 'system');
    });

    return () => {
      socket.off('log');
      socket.off('scheduler-status');
      socket.off('failure-recorded');
      socket.off('failures-cleared');
      socket.off('failure-dismissed');
      socket.off('info-gathering-result-updated');
      socket.off('info-gathering-result-cleared');
      socket.off('info-gathering-all-cleared');
    };
  }, [addLog, fetchTasks, fetchSchedule, fetchSchedulerStatus, fetchSettings, fetchFailures, fetchInfoGathering, initialLayoutResult.migrationMessage]);

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

  const handleRefreshInfoGatheringTask = async (taskName: string) => {
    setRefreshingInfoGatheringTasks(prev => [...prev, taskName]);
    addLog(`Refreshing information: ${taskName}...`, 'system');
    try {
      await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName })
      });
      // Socket.io will update results when complete
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error refreshing task: ${message}`, 'error');
    } finally {
      setRefreshingInfoGatheringTasks(prev => prev.filter(t => t !== taskName));
    }
  };

  const handleClearInfoGatheringResult = async (taskName: string) => {
    try {
      const res = await fetch(`/api/info-gathering/${taskName}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfoGatheringResults(prev => prev.filter(r => r.taskName !== taskName));
      addLog(`Information cleared: ${taskName}`, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing result: ${message}`, 'error');
    }
  };

  const handleClearAllInfoGatheringResults = async () => {
    try {
      const res = await fetch('/api/info-gathering', { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfoGatheringResults([]);
      addLog('All information cleared', 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`Error clearing results: ${message}`, 'error');
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

      let newLayout: DashboardLayoutExtended;

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

  const handleMinimizeCard = (cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      // Find which column the card is in and its index
      let sourceColumn: DashboardColumn | null = null;
      let sourceIndex = -1;

      if (currentLayout.left.includes(cardId)) {
        sourceColumn = 'left';
        sourceIndex = currentLayout.left.indexOf(cardId);
      } else if (currentLayout.right.includes(cardId)) {
        sourceColumn = 'right';
        sourceIndex = currentLayout.right.indexOf(cardId);
      }

      if (!sourceColumn || sourceIndex === -1) {
        return currentLayout;
      }

      // Create minimized card entry
      const minimizedCard: MinimizedCard = {
        id: cardId,
        column: sourceColumn,
        index: sourceIndex
      };

      // Remove from column and add to minimized array
      const newColumnArray = [...currentLayout[sourceColumn]];
      newColumnArray.splice(sourceIndex, 1);

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [sourceColumn]: newColumnArray,
        minimized: [...currentLayout.minimized, minimizedCard]
      };

      saveLayout(newLayout);
      return newLayout;
    });
  };

  const handleRestoreCard = (cardId: DashboardCardId) => {
    setLayout((currentLayout) => {
      // Find the minimized card
      const minimizedCardIndex = currentLayout.minimized.findIndex(m => m.id === cardId);
      if (minimizedCardIndex === -1) {
        return currentLayout;
      }

      const minimizedCard = currentLayout.minimized[minimizedCardIndex];
      const targetColumn = minimizedCard.column;

      // Remove from minimized array
      const newMinimized = [...currentLayout.minimized];
      newMinimized.splice(minimizedCardIndex, 1);

      // Append to the end of the target column
      const newColumnArray = [...currentLayout[targetColumn], cardId];

      const newLayout: DashboardLayoutExtended = {
        ...currentLayout,
        [targetColumn]: newColumnArray,
        minimized: newMinimized
      };

      saveLayout(newLayout);
      return newLayout;
    });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      const newState = !prev;
      saveSidebarState(newState);
      return newState;
    });
  };

  const isUsingDefaultLocation = settings?.geolocation &&
    settings.geolocation.latitude === DEFAULT_LOCATION.latitude &&
    settings.geolocation.longitude === DEFAULT_LOCATION.longitude;

  const showLocationWarning = isUsingDefaultLocation && !locationWarningDismissed;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans transition-colors duration-500 ${sidebarOpen ? 'pr-52' : 'pr-8'}`}>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />

      {/* Sidebar */}
      <MinimizedCardsSidebar
        isOpen={sidebarOpen}
        minimizedCards={layout.minimized}
        onRestoreCard={handleRestoreCard}
        onToggle={handleToggleSidebar}
      />

      <div className="max-w-7xl mx-auto space-y-10 relative py-8 px-8">
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
                  minimizedCards={layout.minimized}
                  onMinimize={handleMinimizeCard}
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
                  infoGatheringResults={infoGatheringResults}
                  onRefreshInfoGatheringTask={handleRefreshInfoGatheringTask}
                  onClearInfoGatheringResult={handleClearInfoGatheringResult}
                  onClearAllInfoGatheringResults={handleClearAllInfoGatheringResults}
                  refreshingInfoGatheringTasks={refreshingInfoGatheringTasks}
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

