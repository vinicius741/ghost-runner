import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "./types";

interface TaskSelectorProps {
  tasks: Task[];
  selectedTask: string;
  onTaskChange: (task: string) => void;
}

export function TaskSelector({ tasks, selectedTask, onTaskChange }: TaskSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Select Automation</label>
      <Select value={selectedTask} onValueChange={onTaskChange}>
        <SelectTrigger className="bg-slate-950/50 border-slate-800/50 text-slate-100 h-11 focus:ring-blue-500/20">
          <SelectValue placeholder="Choose a task..." />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
          {tasks.map(t => (
            <SelectItem
              key={`${t.name}-${t.type}`}
              value={t.name}
              className="focus:bg-blue-500/10 focus:text-blue-200 uppercase text-xs font-semibold tracking-tight"
            >
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
