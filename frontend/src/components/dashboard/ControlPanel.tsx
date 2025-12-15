import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Circle, Play, Square } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';

interface ControlPanelProps {
  onStartScheduler: () => void;
  onStopScheduler: () => void;
  onRecordTask: (name: string, type: 'private' | 'public') => void;
  schedulerStatus: boolean;
}

export function ControlPanel({ onStartScheduler, onStopScheduler, onRecordTask, schedulerStatus }: ControlPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Card className="bg-slate-900/50 backdrop-blur border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 font-normal">Global Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-sky-400 hover:opacity-90"
        >
          <Circle className="w-4 h-4 mr-2 fill-current" /> Record New Task
        </Button>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-100 font-medium">Scheduler</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${schedulerStatus ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {schedulerStatus ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onStartScheduler}
              disabled={schedulerStatus}
            >
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
            <Button
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onStopScheduler}
              disabled={!schedulerStatus}
            >
              <Square className="w-4 h-4 mr-2" /> Stop
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
  );
}
