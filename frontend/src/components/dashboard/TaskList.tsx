import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Layers, Search, Filter, ArrowUpDown, Globe, Lock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

interface TaskListProps {
  tasks: Task[];
  onRunTask: (taskName: string) => void;
}

export function TaskList({ tasks, onRunTask }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "type">("name_asc");

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || task.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "type") return a.type.localeCompare(b.type);
        return 0;
      });
  }, [tasks, searchQuery, typeFilter, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="card-premium h-full overflow-hidden">
        <CardHeader className="flex flex-col gap-6 pb-6 border-b border-slate-800/50">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Available Automations
            </CardTitle>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              {filteredAndSortedTasks.length} / {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950/50 border-slate-800/50 focus:border-blue-500/50 focus:ring-blue-500/10 transition-all rounded-xl h-10 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <Select value={typeFilter} onValueChange={(v: "all" | "public" | "private") => setTypeFilter(v)}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800/50 rounded-xl h-10 text-xs font-semibold uppercase tracking-tight focus:ring-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="all" className="text-xs uppercase font-bold tracking-tight">All Types</SelectItem>
                  <SelectItem value="public" className="text-xs uppercase font-bold tracking-tight">Public Only</SelectItem>
                  <SelectItem value="private" className="text-xs uppercase font-bold tracking-tight">Private Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={sortBy} onValueChange={(v: "name_asc" | "name_desc" | "type") => setSortBy(v)}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800/50 rounded-xl h-10 text-xs font-semibold uppercase tracking-tight focus:ring-blue-500/10">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <SelectValue placeholder="Sort" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="name_asc" className="text-xs uppercase font-bold tracking-tight">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc" className="text-xs uppercase font-bold tracking-tight">Name (Z-A)</SelectItem>
                  <SelectItem value="type" className="text-xs uppercase font-bold tracking-tight">By Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-500 col-span-full text-center py-12 border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20"
                >
                  <p className="text-sm font-medium">No automation tasks found.</p>
                  <p className="text-xs text-slate-600 mt-1">Try adjusting your search or filters.</p>
                </motion.div>
              ) : (
                filteredAndSortedTasks.map((task, index) => (
                  <motion.div
                    key={`${task.name}-${task.type}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => onRunTask(task.name)}
                    className="group relative flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl cursor-pointer hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-blue-200 transition-colors uppercase tracking-tight">{task.name}</span>
                        {task.type === 'public' ? (
                          <Globe className="w-3 h-3 text-emerald-500/70" />
                        ) : task.type === 'private' ? (
                          <Lock className="w-3 h-3 text-amber-500/70" />
                        ) : (
                          <Shield className="w-3 h-3 text-slate-500/70" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${task.type === 'public' ? 'bg-emerald-500' : (task.type === 'private' ? 'bg-amber-500' : 'bg-slate-500')}`} />
                        {task.type} Automation
                      </span>
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


