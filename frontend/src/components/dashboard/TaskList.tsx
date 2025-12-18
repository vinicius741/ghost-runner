import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskListProps {
  tasks: string[];
  onRunTask: (taskName: string) => void;
}

export function TaskList({ tasks, onRunTask }: TaskListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="card-premium h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Available Automations
          </CardTitle>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-500 col-span-full text-center py-12 border-2 border-dashed border-slate-800/50 rounded-2xl"
                >
                  <p className="text-sm font-medium">No automation tasks available.</p>
                  <p className="text-xs text-slate-600 mt-1">Record a new task to get started.</p>
                </motion.div>
              ) : (
                tasks.map((task, index) => (
                  <motion.div
                    key={task}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => onRunTask(task)}
                    className="group relative flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl cursor-pointer hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-200 group-hover:text-blue-200 transition-colors uppercase tracking-tight">{task}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Bot Automation</span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

