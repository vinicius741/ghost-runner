import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Circle, PlusCircle, Lock, Globe } from 'lucide-react';

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
      <DialogContent className="bg-slate-950/95 border-slate-800/50 text-slate-100 sm:max-w-[425px] rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
        <DialogHeader className="pb-4 border-b border-slate-800/50">
          <DialogTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-3">
            <div className="relative">
              <PlusCircle className="w-5 h-5 text-blue-500" />
              <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full animate-pulse" />
            </div>
            Create New Automation
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          <div className="grid gap-2.5">
            <Label htmlFor="name" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              Task Name
            </Label>
            <Input
              id="name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g., login-flow"
              className="bg-slate-900/50 border-slate-800/50 rounded-xl h-11 transition-all focus:border-blue-500/50 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="type" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              Security Level
            </Label>
            <Select value={taskType} onValueChange={(val: 'private' | 'public') => setTaskType(val)}>
              <SelectTrigger className="bg-slate-900/50 border-slate-800/50 rounded-xl h-11 px-4 text-sm font-medium transition-all focus:ring-blue-500/10">
                <div className="flex items-center gap-2.5">
                  {taskType === 'private' ? <Lock className="w-3.5 h-3.5 text-amber-500/70" /> : <Globe className="w-3.5 h-3.5 text-emerald-500/70" />}
                  <SelectValue placeholder="Select type" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-2xl">
                <SelectItem value="private" className="focus:bg-slate-800 focus:text-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-tight">Private Automation</span>
                  </div>
                </SelectItem>
                <SelectItem value="public" className="focus:bg-slate-800 focus:text-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase tracking-tight">Public Automation</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <div className="relative w-full group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-sky-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
            <Button
              onClick={handleRecord}
              className="relative w-full h-12 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 font-bold uppercase tracking-widest transition-all duration-300"
            >
              <Circle className="w-4 h-4 mr-2 fill-blue-500 animate-pulse text-blue-500" />
              Start Recording
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
