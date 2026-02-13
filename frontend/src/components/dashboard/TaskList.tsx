import { useState, useMemo, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Layers, Search, Filter, ArrowUpDown, Globe, Lock, Shield, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Task {
  name: string;
  type: 'public' | 'private' | 'root';
}

interface TaskListProps {
  tasks: Task[];
  onRunTask: (taskName: string) => void;
  onUploadTask: (taskName: string, type: 'private' | 'public', content: string) => Promise<void>;
  onHeaderDoubleClick?: () => void;
}

function normalizeTaskName(fileName: string): string {
  return fileName
    .replace(/\.js$/i, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export function TaskList({ tasks, onRunTask, onUploadTask, onHeaderDoubleClick }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "type">("name_asc");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'public' | 'private'>('private');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Select a JavaScript task file first.');
      return;
    }

    const normalizedTaskName = normalizeTaskName(selectedFile.name);
    if (!normalizedTaskName) {
      setUploadError('File name must produce a valid task name (letters, numbers, hyphens, underscores).');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const content = await selectedFile.text();
      await onUploadTask(normalizedTaskName, uploadType, content);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="card-premium h-full overflow-hidden">
        <CardHeader className="flex flex-col gap-6 pb-6 border-b border-border/50" onDoubleClick={onHeaderDoubleClick}>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground font-medium tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Available Automations
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                {filteredAndSortedTasks.length} / {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[10px] uppercase tracking-wider"
                onClick={() => {
                  setSelectedFile(null);
                  setUploadError(null);
                  setUploadType('private');
                  setIsUploadModalOpen(true);
                }}
              >
                <Upload className="w-3 h-3" />
                Upload
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/10 transition-all rounded-xl h-10 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <Select value={typeFilter} onValueChange={(v: "all" | "public" | "private") => setTypeFilter(v)}>
                <SelectTrigger className="bg-card/50 border-border/50 rounded-xl h-10 text-xs font-semibold uppercase tracking-tight focus:ring-primary/10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="all" className="text-xs uppercase font-bold tracking-tight">All Types</SelectItem>
                  <SelectItem value="public" className="text-xs uppercase font-bold tracking-tight">Public Only</SelectItem>
                  <SelectItem value="private" className="text-xs uppercase font-bold tracking-tight">Private Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={sortBy} onValueChange={(v: "name_asc" | "name_desc" | "type") => setSortBy(v)}>
                <SelectTrigger className="bg-card/50 border-border/50 rounded-xl h-10 text-xs font-semibold uppercase tracking-tight focus:ring-primary/10">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Sort" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
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
                  className="text-muted-foreground col-span-full text-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-card/20"
                >
                  <p className="text-sm font-medium">No automation tasks found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters.</p>
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
                    className="group relative flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors uppercase tracking-tight">{task.name}</span>
                        {task.type === 'public' ? (
                          <Globe className="w-3 h-3 text-emerald-500/70" />
                        ) : task.type === 'private' ? (
                          <Lock className="w-3 h-3 text-amber-500/70" />
                        ) : (
                          <Shield className="w-3 h-3 text-muted-foreground/70" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${task.type === 'public' ? 'bg-emerald-500' : (task.type === 'private' ? 'bg-amber-500' : 'bg-foreground')}`} />
                        {task.type} Automation
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Task File</DialogTitle>
            <DialogDescription>
              Upload a JavaScript task file. The task name will be derived from the file name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-upload-type">Task Type</Label>
              <Select
                value={uploadType}
                onValueChange={(value: 'public' | 'private') => setUploadType(value)}
              >
                <SelectTrigger id="task-upload-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-upload-file">Task File (.js)</Label>
              <Input
                id="task-upload-file"
                type="file"
                accept=".js,text/javascript,application/javascript"
                onChange={onFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Will save as task: <span className="font-mono">{normalizeTaskName(selectedFile.name)}</span>
                </p>
              )}
              {uploadError && (
                <p className="text-xs text-red-500">{uploadError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleUpload();
              }}
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? 'Uploading...' : 'Upload Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
