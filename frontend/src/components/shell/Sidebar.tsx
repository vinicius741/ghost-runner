import { cn } from '@/lib/utils';
import { UpdateButton } from '@/components/dashboard/UpdateButton';
import { NAV_ITEMS, type PageId } from './navigation';
import { SchedulerControl, SchedulerToggleCompact } from './SchedulerControl';

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  counts: Partial<Record<PageId, number>>;
  schedulerRunning: boolean;
  onStartScheduler: () => void;
  onStopScheduler: () => void;
}

/**
 * Fixed left rail on large screens; collapses into a top bar with a
 * horizontally scrolling nav on smaller windows.
 */
export function Sidebar({
  page,
  onNavigate,
  counts,
  schedulerRunning,
  onStartScheduler,
  onStopScheduler,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 z-30 flex flex-col border-b border-border bg-background lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-b-0 lg:border-r">
      <div className="flex h-12 shrink-0 items-center gap-2.5 px-4 lg:h-14">
        <img src="/logo.png" alt="" className="h-6 w-6 rounded-md" />
        <span className="shrink-0 text-[14px] font-semibold tracking-[-0.01em] text-foreground">Ghost Runner</span>
        <SchedulerToggleCompact
          className="ml-auto lg:hidden"
          running={schedulerRunning}
          onStart={onStartScheduler}
          onStop={onStopScheduler}
        />
      </div>

      <nav aria-label="Main" className="min-w-0 overflow-x-auto px-2 pb-2 lg:flex-1 lg:overflow-y-auto lg:pb-0 lg:pt-1">
        <ul className="flex gap-0.5 lg:flex-col">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            const count = counts[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-8 w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-[13px] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    active
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-faint')} aria-hidden="true" />
                  <span>{label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        'ml-auto pl-2 font-mono text-[11px] tabular-nums',
                        id === 'failures' ? 'text-destructive' : 'text-faint'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden shrink-0 space-y-2 border-t border-border p-3 lg:block">
        <SchedulerControl
          running={schedulerRunning}
          onStart={onStartScheduler}
          onStop={onStopScheduler}
        />
        <UpdateButton />
      </div>
    </aside>
  );
}
