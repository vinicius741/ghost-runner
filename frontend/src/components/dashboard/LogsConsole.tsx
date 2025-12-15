import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [logs]);

  return (
    <Card className="bg-slate-900/50 backdrop-blur border-slate-700 mt-6 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-slate-100 font-normal">System Logs</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClearLogs} className="h-8 text-slate-400 hover:text-slate-200">
          Clear Logs
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ScrollArea className="h-[300px] w-full bg-black/50 border border-slate-800 rounded-md p-4" ref={scrollRef}>
          <div className="font-mono text-sm space-y-1">
            {logs.length === 0 && <div className="text-slate-600 italic">Waiting for activity...</div>}
            {logs.map((log, i) => (
              <div key={i} className={`border-b border-white/5 pb-1 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'system' ? 'text-slate-500 italic' :
                'text-slate-300'
              }`}>
                <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
