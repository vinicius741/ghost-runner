import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play } from 'lucide-react';

interface TaskListProps {
  tasks: string[];
  onRunTask: (taskName: string) => void;
}

export function TaskList({ tasks, onRunTask }: TaskListProps) {
  return (
    <Card className="bg-slate-900/50 backdrop-blur border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 font-normal">Available Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tasks.length === 0 ? (
            <div className="text-slate-400 col-span-full text-center py-4">No tasks found.</div>
          ) : (
            tasks.map(task => (
              <div
                key={task}
                onClick={() => onRunTask(task)}
                className="group flex items-center justify-between p-4 bg-white/5 border border-slate-700 rounded-xl cursor-pointer hover:bg-white/10 hover:-translate-y-0.5 hover:border-blue-500/30 transition-all duration-200"
              >
                <span className="font-medium text-slate-200 group-hover:text-blue-200 transition-colors">{task}</span>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
