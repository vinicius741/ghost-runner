import { useEffect, useState } from 'react';
import type { Task, TaskSource, TaskSourceSaveType } from '@shared/types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import './prism-theme.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TaskEditorDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadTaskSource: (taskName: string) => Promise<TaskSource>;
  onSaveTaskSource: (taskName: string, type: TaskSourceSaveType, content: string) => Promise<void>;
}

function formatSaveTarget(saveType: TaskSourceSaveType): string {
  return `${saveType} override`;
}

function formatSourceOrigin(sourceOrigin: TaskSource['sourceOrigin']): string {
  return sourceOrigin === 'writable' ? 'Writable file' : 'Bundled file';
}

export function TaskEditorDialog({
  task,
  open,
  onOpenChange,
  onLoadTaskSource,
  onSaveTaskSource,
}: TaskEditorDialogProps) {
  const [taskSource, setTaskSource] = useState<TaskSource | null>(null);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) {
      setTaskSource(null);
      setContent('');
      setInitialContent('');
      setIsLoading(false);
      setIsSaving(false);
      setError(null);
      setSaveNotice(null);
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setSaveNotice(null);

      try {
        const source = await onLoadTaskSource(task.name);
        if (!active) {
          return;
        }

        setTaskSource(source);
        setContent(source.content);
        setInitialContent(source.content);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, task, onLoadTaskSource]);

  const isDirty = content !== initialContent;
  const shouldExplainOverride = Boolean(taskSource && (taskSource.sourceOrigin === 'bundled' || taskSource.type === 'root'));

  const handleSave = async () => {
    if (!taskSource || !task) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSaveNotice(null);
      await onSaveTaskSource(task.name, taskSource.saveType, content);
      setInitialContent(content);
      setTaskSource((current) => current
        ? { ...current, content, type: current.saveType, sourceOrigin: 'writable' }
        : current);
      setSaveNotice(`Saved to ${formatSaveTarget(taskSource.saveType)}.`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-border/60 bg-card/95 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/50 px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-xl">
            Edit Automation Script
            {task && (
              <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {task.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edit the JavaScript source for this automation. Changes affect future runs only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {taskSource && (
            <div className="grid gap-3 rounded-2xl border border-border/50 bg-background/60 p-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Name</p>
                <p className="font-mono text-sm text-foreground">{taskSource.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current Type</p>
                <p className="font-mono text-sm text-foreground">{taskSource.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Source</p>
                <p className="text-sm text-foreground">{formatSourceOrigin(taskSource.sourceOrigin)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Save Target</p>
                <p className="text-sm text-foreground">{formatSaveTarget(taskSource.saveType)}</p>
              </div>
            </div>
          )}

          {shouldExplainOverride && taskSource && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {taskSource.type === 'root'
                ? 'This automation currently resolves from a root task. Saving will create or update a public override.'
                : 'This automation currently resolves from bundled app files. Saving will create or update a writable override.'}
            </div>
          )}

          {saveNotice && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {saveNotice}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/40 text-sm text-muted-foreground">
              Loading automation source...
            </div>
          ) : taskSource ? (
            <div className="space-y-2">
              <label
                htmlFor="task-source-editor"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
              >
                Script Source
              </label>
              <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-border/60 shadow-inner transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 bg-slate-950">
                <Editor
                  value={content}
                  onValueChange={code => {
                      setContent(code);
                      setSaveNotice(null);
                  }}
                  highlight={code => highlight(code, languages.javascript, 'javascript')}
                  padding={16}
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: 14,
                    minHeight: "100%",
                  }}
                  textareaClassName="focus:outline-none"
                  className="h-full w-full overflow-auto font-mono text-sm leading-6 text-slate-100"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/40 text-sm text-muted-foreground">
              Select an automation to edit.
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 px-6 py-4">
          <div className="mr-auto text-xs text-muted-foreground">
            {taskSource ? (isDirty ? 'Unsaved changes' : 'No unsaved changes') : ''}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isLoading || isSaving || !taskSource || !isDirty}
          >
            {isSaving ? 'Saving...' : 'Save Script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
