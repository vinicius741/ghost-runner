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
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Select Automation</label>
      <Select value={selectedTask} onValueChange={onTaskChange}>
        <SelectTrigger className="bg-card/50 border-border/50 text-foreground h-11 focus:ring-primary/20">
          <SelectValue placeholder="Choose a task..." />
        </SelectTrigger>
        <SelectContent className="bg-card border-border text-foreground">
          {tasks.map(t => (
            <SelectItem
              key={`${t.name}-${t.type}`}
              value={t.name}
              className="focus:bg-primary/10 focus:text-primary uppercase text-xs font-semibold tracking-tight"
            >
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
