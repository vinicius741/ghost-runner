import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock } from 'lucide-react';
import type { ScheduleItem } from "./types";

interface ScheduleListProps {
  schedule: ScheduleItem[];
  onDeleteSchedule: (index: number) => void;
}

export function ScheduleList({ schedule, onDeleteSchedule }: ScheduleListProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Active Schedules</h3>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {schedule.length === 0 ? (
            <EmptyState />
          ) : (
            schedule.map((item, idx) => (
              <ScheduleItem
                key={`${item.task}-${idx}`}
                item={item}
                onDelete={() => onDeleteSchedule(idx)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-muted-foreground/60 text-center py-8 border border-dashed border-border/50 rounded-2xl bg-card/20"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest">No active schedules</p>
    </motion.div>
  );
}

interface ScheduleItemProps {
  item: ScheduleItem;
  onDelete: () => void;
}

function ScheduleItem({ item, onDelete }: ScheduleItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-300"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-foreground uppercase tracking-tight">{item.task}</span>
        <div className="flex items-center gap-2">
          {item.cron && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold font-mono rounded-md border border-primary/10">
              <Calendar className="w-2.5 h-2.5" />
              {item.cron}
            </span>
          )}
          {item.executeAt && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono rounded-md border border-emerald-500/10">
              <Clock className="w-2.5 h-2.5" />
              {new Date(item.executeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted border border-border text-muted-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-300"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
