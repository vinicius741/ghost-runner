import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/common/SegmentedControl';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (name: string, type: 'private' | 'public') => void;
}

export function CreateTaskModal({ isOpen, onClose, onRecord }: CreateTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<'private' | 'public'>('private');

  const handleRecord = (event?: FormEvent) => {
    event?.preventDefault();
    if (!taskName.trim()) return;
    onRecord(taskName, taskType);
    setTaskName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleRecord} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Record a new task</DialogTitle>
            <DialogDescription>
              Opens Playwright Codegen. Your clicks and typing are saved as a task script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="record-task-name">Name</Label>
            <Input
              id="record-task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. login-flow"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label id="record-task-visibility-label">Visibility</Label>
            <SegmentedControl
              ariaLabelledBy="record-task-visibility-label"
              className="flex w-full"
              value={taskType}
              onChange={setTaskType}
              options={[
                { value: 'private', label: 'Private' },
                { value: 'public', label: 'Public' },
              ]}
            />
            <p className="text-xs text-faint">
              {taskType === 'private'
                ? 'Saved to tasks/private, which is not committed to git.'
                : 'Saved to tasks/public and shared with the repository.'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!taskName.trim()}>
              Start recording
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
