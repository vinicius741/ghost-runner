import { useEffect, useState, type ReactNode } from 'react';
import type { Task, TaskSource, TaskSourceSaveType } from '@shared/types';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import './prism-theme.css';
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
  return sourceOrigin === 'writable' ? 'writable file' : 'bundled file';
}

// `react-simple-code-editor` ships a CommonJS build (`exports.default = Editor`).
// Vite's dependency pre-bundling wraps it so a default ESM import resolves to
// the CJS exports object (`{ default: Editor }`) instead of the component
// itself. Normalize the shape by unwrapping nested `.default` properties so the
// real component is used. Without this, React throws "Element type is invalid:
// ... got: object" when the editor renders, which unmounts the dialog and
// leaves only the dark overlay (the reported black screen).
function resolveEditor<T>(source: unknown): T {
  let current: unknown = source;
  for (let depth = 0; depth < 2 && current && typeof current === 'object' && 'default' in current; depth += 1) {
    current = (current as { default: unknown }).default;
  }
  return current as T;
}
const CodeEditor = resolveEditor<typeof Editor>(Editor);

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
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            Edit script
            {task && <span className="font-mono text-[13px] font-normal text-muted-foreground">{task.name}</span>}
          </DialogTitle>
          <DialogDescription>
            Changes apply to future runs only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {taskSource && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div className="flex gap-1.5">
                <dt className="text-faint">Type</dt>
                <dd className="text-muted-foreground">{taskSource.type}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-faint">Source</dt>
                <dd className="text-muted-foreground">{formatSourceOrigin(taskSource.sourceOrigin)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-faint">Saves to</dt>
                <dd className="text-muted-foreground">{formatSaveTarget(taskSource.saveType)}</dd>
              </div>
            </dl>
          )}

          {shouldExplainOverride && taskSource && (
            <Notice tone="warning">
              {taskSource.type === 'root'
                ? 'This task resolves from a root task. Saving creates or updates a public override.'
                : 'This task resolves from bundled app files. Saving creates or updates a writable override.'}
            </Notice>
          )}

          {saveNotice && <Notice tone="success">{saveNotice}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}

          {isLoading ? (
            <div className="flex h-[440px] items-center justify-center rounded-md border border-dashed border-border-strong text-[13px] text-muted-foreground">
              Loading script…
            </div>
          ) : taskSource ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-source-editor" className="sr-only">
                Script source
              </label>
              <div className="h-[440px] w-full overflow-hidden rounded-md border border-input bg-background focus-within:border-primary/60">
                <CodeEditor
                  value={content}
                  onValueChange={(code) => {
                    setContent(code);
                    setSaveNotice(null);
                  }}
                  highlight={(code) => highlight(code, languages.javascript, 'javascript')}
                  padding={14}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    minHeight: '100%',
                  }}
                  textareaId="task-source-editor"
                  textareaClassName="focus:outline-none"
                  className="h-full w-full overflow-auto font-mono leading-6 text-foreground"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-[440px] items-center justify-center rounded-md border border-dashed border-border-strong text-[13px] text-muted-foreground">
              Select a task to edit.
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <p className="mr-auto text-xs text-muted-foreground">
            {taskSource ? (isDirty ? 'Unsaved changes' : 'No unsaved changes') : ''}
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Close
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isLoading || isSaving || !taskSource || !isDirty}
          >
            {isSaving ? 'Saving…' : 'Save script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Notice({ tone, children }: { tone: 'warning' | 'success' | 'error'; children: ReactNode }) {
  const styles = {
    warning: 'border-warning/25 bg-warning/[0.07] text-warning',
    success: 'border-success/25 bg-success/[0.07] text-success',
    error: 'border-destructive/25 bg-destructive/[0.07] text-destructive',
  }[tone];
  return <div className={`rounded-md border px-3 py-2 text-[13px] ${styles}`}>{children}</div>;
}
