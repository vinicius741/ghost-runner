import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "./types";

interface TaskSelectorProps {
  tasks: Task[];
  selectedTask: string;
  onTaskChange: (task: string) => void;
}

export function TaskSelector({ tasks, selectedTask, onTaskChange }: TaskSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="schedule-task">Task</Label>
      <Select value={selectedTask} onValueChange={onTaskChange}>
        <SelectTrigger id="schedule-task">
          <SelectValue placeholder="Choose a task" />
        </SelectTrigger>
        <SelectContent>
          {tasks.map((t) => (
            <SelectItem key={`${t.name}-${t.type}`} value={t.name}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
