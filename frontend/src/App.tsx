import { useState } from 'react';
import { Header } from "@/components/dashboard/Header";
import { TaskCalendar } from "@/components/dashboard/TaskCalendar";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { LocationWarning } from "@/components/dashboard/LocationWarning";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { MinimizedCardsSidebar } from "@/components/dashboard/MinimizedCardsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Calendar, Settings as SettingsIcon } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ThemeProvider>
  );
}

/**
 * Dashboard content component using the DashboardContext.
 * Separated to use context hooks within the provider.
 */
function DashboardContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showLocationWarning, setShowLocationWarning] = useState(true);

  const {
    sidebarOpen,
    layout,
    schedulerStatus,
    tasks,
    schedule,
    logs,
    failures,
    infoGatheringResults,
    refreshingInfoGatheringTasks,
    addLog,
    clearLogs,
    startScheduler,
    stopScheduler,
    runTask,
    recordTask,
    uploadTask,
    addScheduleItem,
    deleteScheduleItem,
    clearFailures,
    dismissFailure,
    refreshInfoGatheringTask,
    clearInfoGatheringResult,
    clearAllInfoGatheringResults,
    handleCardReorder,
    minimizeCard,
    restoreCard,
    toggleSidebar,
    fetchSettings,
    showLocationWarning: contextLocationWarning,
    dismissLocationWarning,
  } = useDashboard();

  return (
    <div className={`min-h-screen bg-background text-foreground font-sans transition-all duration-500 ${sidebarOpen ? 'pr-52' : 'pr-8'}`}>
      {/* Theme-aware background overlay */}
      <div className="fixed inset-0 pointer-events-none theme-bg-overlay" />
      <div className="fixed inset-0 pointer-events-none theme-bg-texture" />

      {/* Sidebar */}
      <MinimizedCardsSidebar
        isOpen={sidebarOpen}
        minimizedCards={layout.minimized}
        onRestoreCard={restoreCard}
        onToggle={toggleSidebar}
      />

      <div className="max-w-7xl mx-auto space-y-10 relative py-8 px-8">
        <Header />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-card/40 backdrop-blur-xl border border-border/50 h-14 p-1.5 gap-1.5 rounded-2xl shadow-2xl">
              <TabsTrigger
                value="dashboard"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:text-foreground"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:text-foreground"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Calendar</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="px-8 py-2.5 gap-2.5 rounded-xl text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:text-foreground"
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
                  {showLocationWarning && contextLocationWarning && (
                    <LocationWarning
                      onDismiss={() => {
                        setShowLocationWarning(false);
                        dismissLocationWarning();
                      }}
                      onGoToSettings={() => setActiveTab('settings')}
                    />
                  )}
                </AnimatePresence>
                <DashboardGrid
                  layout={layout}
                  minimizedCards={layout.minimized}
                  onMinimize={minimizeCard}
                  onDragEnd={handleCardReorder}
                  onStartScheduler={startScheduler}
                  onStopScheduler={stopScheduler}
                  onRecordTask={recordTask}
                  schedulerStatus={schedulerStatus}
                  tasks={tasks}
                  schedule={schedule}
                  onAddSchedule={addScheduleItem}
                  onDeleteSchedule={(index) => {
                    if (confirm('Are you sure you want to delete this schedule?')) {
                      deleteScheduleItem(index);
                    }
                  }}
                  onRunTask={runTask}
                  onUploadTask={uploadTask}
                  logs={logs}
                  onClearLogs={clearLogs}
                  failures={failures}
                  onClearFailures={clearFailures}
                  onDismissFailure={dismissFailure}
                  infoGatheringResults={infoGatheringResults}
                  onRefreshInfoGatheringTask={refreshInfoGatheringTask}
                  onClearInfoGatheringResult={clearInfoGatheringResult}
                  onClearAllInfoGatheringResults={clearAllInfoGatheringResults}
                  refreshingInfoGatheringTasks={refreshingInfoGatheringTasks}
                />
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <div className="card-premium p-6 rounded-3xl">
                  <TaskCalendar schedule={schedule} onDeleteSchedule={deleteScheduleItem} />
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
