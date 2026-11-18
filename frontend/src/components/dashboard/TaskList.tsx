import { useState, useMemo, type ChangeEvent } from 'react';
import type { Task, TaskSource, TaskSourceSaveType } from '@shared/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Search, Upload, Loader2, Pencil, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { EmptyState } from '@/components/common/EmptyState';
import { TaskTypeTag } from '@/components/common/TaskTypeTag';
import { TaskEditorDialog } from './TaskEditorDialog';

interface TaskListProps {
  tasks: Task[];
  runningTasks: Set<string>;
  onRunTask: (taskName: string) => void;
  onUploadTask: (taskName: string, type: 'private' | 'public', content: string) => Promise<void>;
  onLoadTaskSource: (taskName: string) => Promise<TaskSource>;
  onSaveTaskSource: (taskName: string, type: TaskSourceSaveType, content: string) => Promise<void>;
  className?: string;
}

type TypeFilter = 'all' | 'public' | 'private';
type SortOrder = 'name_asc' | 'name_desc' | 'type';

function normalizeTaskName(fileName: string): string {
  return fileName
    .replace(/\.js$/i, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export function TaskList({
  tasks,
  runningTasks,
  onRunTask,
  onUploadTask,
  onLoadTaskSource,
  onSaveTaskSource,
  className,
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOrder>('name_asc');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [uploadType, setUploadType] = useState<'public' | 'private'>('private');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredAndSortedTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return tasks
      .filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(query);
        const matchesType = typeFilter === 'all' || task.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
      });
  }, [tasks, searchQuery, typeFilter, sortBy]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const openUpload = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadType('private');
    setIsUploadModalOpen(true);
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
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploading(false);
    }
  };

  const isFiltered = filteredAndSortedTasks.length !== tasks.length;

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="flex-wrap gap-2 py-2.5">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              placeholder="Search tasks"
              aria-label="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              ariaLabel="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
              ]}
            />
            <Select value={sortBy} onValueChange={(v: SortOrder) => setSortBy(v)}>
              <SelectTrigger className="w-[120px]" aria-label="Sort tasks">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Name A–Z</SelectItem>
                <SelectItem value="name_desc">Name Z–A</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={openUpload}>
              <Upload />
              Upload
            </Button>
          </div>
        </CardHeader>

        {filteredAndSortedTasks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            description={
              tasks.length === 0
                ? 'Record a new task or upload a JavaScript task file to get started.'
                : 'Try a different search or filter.'
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {filteredAndSortedTasks.map((task) => {
              const isRunning = runningTasks.has(task.name);
              return (
                <li
                  key={`${task.name}-${task.type}`}
                  className={cn(
                    'group flex items-center pr-3 transition-colors duration-100',
                    isRunning ? 'bg-primary/[0.04]' : 'hover:bg-accent/60'
                  )}
                >
                  {/* The run target and the Edit button are siblings so no
                      interactive element is nested inside role="button". */}
                  <div
                    role="button"
                    tabIndex={isRunning ? -1 : 0}
                    aria-disabled={isRunning}
                    aria-label={isRunning ? `${task.name} (running)` : `Run ${task.name}`}
                    onKeyDown={(e) => {
                      if (!isRunning && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRunTask(task.name);
                      }
                    }}
                    onClick={() => {
                      if (!isRunning) onRunTask(task.name);
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-2 focus-visible:bg-accent focus-visible:outline-none',
                      isRunning ? 'cursor-default' : 'cursor-pointer'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="truncate text-[13px] font-medium text-foreground">{task.name}</span>
                      <TaskTypeTag type={task.type} className="shrink-0" />
                    </div>

                    {isRunning ? (
                      <span className="inline-flex h-7 w-[58px] shrink-0 items-center justify-center gap-1 text-xs font-medium text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Running
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-[58px] shrink-0 items-center justify-center gap-1 rounded-md border border-border-strong text-xs font-medium text-muted-foreground transition-colors duration-100 group-hover:border-primary/50 group-hover:text-primary"
                      >
                        <Play className="h-3 w-3" />
                        Run
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${task.name}`}
                    title="Edit script"
                    onClick={() => setEditingTask(task)}
                  >
                    <Pencil />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {isFiltered && tasks.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-xs text-faint">
            Showing {filteredAndSortedTasks.length} of {tasks.length}
          </div>
        )}
      </Card>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload task file</DialogTitle>
            <DialogDescription>
              The task name comes from the file name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label id="task-upload-type-label">Visibility</Label>
              <SegmentedControl
                ariaLabelledBy="task-upload-type-label"
                className="flex w-full"
                value={uploadType}
                onChange={setUploadType}
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'public', label: 'Public' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-upload-file">Task File (.js)</Label>
              <Input
                id="task-upload-file"
                type="file"
                accept=".js,text/javascript,application/javascript"
                onChange={onFileChange}
                className="cursor-pointer pl-0"
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Saves as <span className="font-mono text-foreground">{normalizeTaskName(selectedFile.name)}</span>
                </p>
              )}
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpload()} disabled={isUploading || !selectedFile}>
              {isUploading ? 'Uploading…' : 'Upload task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskEditorDialog
        task={editingTask}
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        onLoadTaskSource={onLoadTaskSource}
        onSaveTaskSource={onSaveTaskSource}
      />
    </>
  );
}
