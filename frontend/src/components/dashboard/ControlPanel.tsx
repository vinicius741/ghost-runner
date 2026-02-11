import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Circle, Play, Square } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { motion } from 'framer-motion';

interface ControlPanelProps {
  onStartScheduler: () => void;
  onStopScheduler: () => void;
  onRecordTask: (name: string, type: 'private' | 'public') => void;
  schedulerStatus: boolean;
  onHeaderDoubleClick?: () => void;
}

export function ControlPanel({ onStartScheduler, onStopScheduler, onRecordTask, schedulerStatus, onHeaderDoubleClick }: ControlPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="card-premium">
        <CardHeader className="pb-4" onDoubleClick={onHeaderDoubleClick}>
          <CardTitle className="text-foreground font-medium tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: 'var(--glow-primary)' }} />
            Global Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
            <Button
              onClick={() => setIsModalOpen(true)}
              className="relative w-full bg-card border border-border hover:bg-muted text-foreground"
            >
              <Circle className="w-4 h-4 mr-2 fill-primary animate-pulse text-primary" />
              <span className="font-semibold tracking-wide">Record New Task</span>
            </Button>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Scheduler Engine</h3>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${schedulerStatus ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-tight ${schedulerStatus ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {schedulerStatus ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-30 transition-all duration-300"
                onClick={onStartScheduler}
                disabled={schedulerStatus}
              >
                <Play className="w-3.5 h-3.5 mr-2 fill-current" /> <span className="text-xs font-bold uppercase tracking-widest">Start</span>
              </Button>
              <Button
                variant="outline"
                className="h-11 bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 disabled:opacity-30 transition-all duration-300"
                onClick={onStopScheduler}
                disabled={!schedulerStatus}
              >
                <Square className="w-3.5 h-3.5 mr-2 fill-current" /> <span className="text-xs font-bold uppercase tracking-widest">Stop</span>
              </Button>
            </div>
          </div>
        </CardContent>

        <CreateTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRecord={onRecordTask}
        />
      </Card>
    </motion.div>
  );
}

