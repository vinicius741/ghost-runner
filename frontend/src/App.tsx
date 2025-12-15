import { useState, useEffect } from 'react';
import { Header } from "@/components/dashboard/Header";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { TaskList } from "@/components/dashboard/TaskList";
import { ScheduleBuilder } from "@/components/dashboard/ScheduleBuilder";
import { LogsConsole } from "@/components/dashboard/LogsConsole";
import { io } from "socket.io-client";

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
  const [tasks, setTasks] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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

    socket.on('log', (message: string) => {
      addLog(message);
    });

    return () => {
      socket.off('log');
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
    if (confirm('Are you sure?')) {
      const newSchedule = [...schedule];
      newSchedule.splice(index, 1);
      setSchedule(newSchedule);
      await saveSchedule(newSchedule);
    }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
             <ControlPanel
               onStartScheduler={handleStartScheduler}
               onStopScheduler={handleStopScheduler}
               onRecordTask={handleRecordTask}
             />
             <ScheduleBuilder
               tasks={tasks}
               schedule={schedule}
               onAddSchedule={handleAddSchedule}
               onDeleteSchedule={handleDeleteSchedule}
             />
          </div>

          <div className="lg:col-span-2 space-y-6">
             <TaskList tasks={tasks} onRunTask={handleRunTask} />
             <LogsConsole logs={logs} onClearLogs={() => setLogs([])} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
