import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Timer, AlertCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface NextTask {
    task: string;
    nextRun: string;
    delayMs: number;
}

interface NextTaskTimerProps {
    schedulerRunning: boolean;
    onHeaderDoubleClick?: () => void;
}

export function NextTaskTimer({ schedulerRunning, onHeaderDoubleClick }: NextTaskTimerProps) {
    const [nextTask, setNextTask] = useState<NextTask | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');

    const fetchNextTask = async () => {
        try {
            const res = await fetch('/api/scheduler/next-task');
            const data = await res.json();
            setNextTask(data.nextTask);
        } catch {
            console.error('Error fetching next task');
        }
    };

    useEffect(() => {
        if (schedulerRunning) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchNextTask();
            const interval = setInterval(fetchNextTask, 30000); // Poll every 30s
            return () => clearInterval(interval);
        } else {
            setNextTask(null);
            setTimeLeft('');
        }
    }, [schedulerRunning]);

    useEffect(() => {
        if (!nextTask) return;

        const timer = setInterval(() => {
            const now = new Date();
            const target = new Date(nextTask.nextRun);
            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('Executing...');
                fetchNextTask();
            } else {
                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                const parts = [];
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
                parts.push(`${seconds}s`);

                setTimeLeft(parts.join(' '));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nextTask]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <Card className="card-premium">
                <CardHeader className="pb-4" onDoubleClick={onHeaderDoubleClick}>
                    <CardTitle className="text-foreground font-medium tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" style={{ boxShadow: 'var(--glow-primary)' }} />
                        Next Automation
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {!schedulerRunning ? (
                        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-card/50 border border-border/50 text-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h4 className="text-foreground text-sm font-bold">Scheduler Offline</h4>
                                <p className="text-muted-foreground text-[10px] mt-1 uppercase tracking-wider font-bold">Waiting for activation</p>
                            </div>
                        </div>
                    ) : !nextTask ? (
                        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-card/50 border border-border/50 text-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-foreground text-sm font-bold">Queue Empty</h4>
                                <p className="text-muted-foreground text-[10px] mt-1 uppercase tracking-wider font-bold">Add tasks to schedule</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">Target Task</span>
                                        <h4 className="text-foreground text-lg font-bold leading-tight mt-1">{nextTask.task}</h4>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Pending</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center py-4 border-y border-border/30">
                                    <span className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/70 to-foreground/40 tabular-nums">
                                        {timeLeft}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mt-1">Countdown</span>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">Execution Time</span>
                                    </div>
                                    <span className="text-foreground/80 text-[10px] font-mono font-bold">
                                        {new Date(nextTask.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
