import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (name: string, type: 'private' | 'public') => void;
}

export function CreateTaskModal({ isOpen, onClose, onRecord }: CreateTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<'private' | 'public'>('private');

  const handleRecord = () => {
    if (!taskName.trim()) return;
    onRecord(taskName, taskType);
    setTaskName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g., login-flow"
              className="bg-slate-950 border-slate-800"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Task Type</Label>
            <Select value={taskType} onValueChange={(val: 'private' | 'public') => setTaskType(val)}>
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleRecord} className="w-full bg-blue-600 hover:bg-blue-700">Start Recording</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
