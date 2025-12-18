import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Trash2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  message: string;
  timestamp: string;
  type: 'normal' | 'error' | 'system';
}

interface LogsConsoleProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function LogsConsole({ logs, onClearLogs }: LogsConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="card-premium mt-6 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/50 bg-slate-900/20">
          <CardTitle className="text-slate-100 font-medium tracking-tight flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            System Runtime Logs
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/50">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter italic">Streaming</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              className="h-8 text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-xs">Clear</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-black/40">
          <ScrollArea className="h-[350px] w-full" ref={scrollRef}>
            <div className="font-mono text-[13px] p-4 pt-4 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {logs.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-600 italic py-4 flex items-center gap-2"
                  >
                    <span className="w-1 h-3 bg-blue-500/50 animate-pulse" />
                    Listening for bot signals...
                  </motion.div>
                ) : (
                  logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 leading-relaxed group ${log.type === 'error' ? 'text-red-400 bg-red-500/5 -mx-4 px-4' :
                          log.type === 'system' ? 'text-blue-400/80 font-semibold' :
                            'text-slate-300'
                        }`}
                    >
                      <span className="text-slate-600 select-none flex-shrink-0 min-w-[85px] group-hover:text-slate-500 transition-colors">
                        [{log.timestamp}]
                      </span>
                      <span className="break-all whitespace-pre-wrap">
                        {log.type === 'system' && <span className="mr-2">»</span>}
                        {log.message}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

