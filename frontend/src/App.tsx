import { useState, useEffect } from 'react';
import { Header } from "@/components/dashboard/Header";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { TaskList } from "@/components/dashboard/TaskList";
import { ScheduleBuilder } from "@/components/dashboard/ScheduleBuilder";
import { LogsConsole } from "@/components/dashboard/LogsConsole";
import { TaskCalendar } from "@/components/dashboard/TaskCalendar";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Settings as SettingsIcon } from 'lucide-react';

interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

interface LogEntry {
  message: string;
  timestamp: string;
  type: 'normal' | 'error' | 'system';
}

interface ScheduleItem {
  task: string;
  cron?: string;
  executeAt?: string;
}

const socket = io();

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("dashboard");

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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-8">
                    <ControlPanel
                      onStartScheduler={handleStartScheduler}
                      onStopScheduler={handleStopScheduler}
                      onRecordTask={handleRecordTask}
                      schedulerStatus={schedulerStatus}
                    />
                    <ScheduleBuilder
                      tasks={tasks}
                      schedule={schedule}
                      onAddSchedule={handleAddSchedule}
                      onDeleteSchedule={(index) => {
                        if (confirm('Are you sure you want to delete this schedule?')) {
                          handleDeleteSchedule(index);
                        }
                      }}
                    />
                  </div>

                  <div className="lg:col-span-8 flex flex-col gap-8">
                    <TaskList tasks={tasks} onRunTask={handleRunTask} />
                    <LogsConsole logs={logs} onClearLogs={() => setLogs([])} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <div className="card-premium p-6 rounded-3xl bg-slate-900/30">
                  <TaskCalendar schedule={schedule} onDeleteSchedule={handleDeleteSchedule} />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="max-w-3xl mx-auto py-4">
                  <SettingsManager />
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

