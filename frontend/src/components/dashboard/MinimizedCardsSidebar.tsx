import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sliders, Layers, CalendarClock, Terminal, AlertTriangle, Timer, Maximize2, Database } from 'lucide-react';
import type { MinimizedCard, DashboardCardId } from '@/types';
import { CARD_METADATA } from '@/types';

interface MinimizedCardsSidebarProps {
  isOpen: boolean;
  minimizedCards: MinimizedCard[];
  onRestoreCard: (cardId: DashboardCardId) => void;
  onToggle: () => void;
}

const ICONS: Record<DashboardCardId, React.ComponentType<{ className?: string }>> = {
  controlPanel: Sliders,
  taskList: Layers,
  scheduleBuilder: CalendarClock,
  logsConsole: Terminal,
  warningsPanel: AlertTriangle,
  nextTaskTimer: Timer,
  infoGathering: Database,
};

const SIDEBAR_WIDTH_REM = 12; // w-48 in Tailwind is 12rem

export function MinimizedCardsSidebar({ isOpen, minimizedCards, onRestoreCard, onToggle }: MinimizedCardsSidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: 1, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 1, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 z-40 w-48 bg-card/95 backdrop-blur-xl border-l border-border flex flex-col"
            style={{ width: `${SIDEBAR_WIDTH_REM}rem` }}
          >
            {/* Header */}
            <div className="p-3 border-b border-border">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minimized</h2>
            </div>

            {/* Minimized Cards List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {minimizedCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No minimized cards
                </div>
              ) : (
                <AnimatePresence>
                  {minimizedCards.map((card) => {
                    const metadata = CARD_METADATA[card.id];
                    const IconComponent = ICONS[card.id];

                    return (
                      <motion.button
                        key={card.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => onRestoreCard(card.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors group"
                        type="button"
                      >
                        <IconComponent className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground/80 group-hover:text-foreground truncate flex-1">
                          {metadata.displayName}
                        </span>
                        <Maximize2 className="w-3 h-3 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        animate={{ right: isOpen ? `${SIDEBAR_WIDTH_REM}rem` : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={onToggle}
        className="fixed top-4 z-50 h-10 w-10 flex items-center justify-center rounded-l-lg bg-muted/90 backdrop-blur-sm border border-l border-t border-b border-border text-muted-foreground hover:text-foreground hover:bg-secondary/90 transition-colors"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        type="button"
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
        {/* Badge showing minimized count - visible when sidebar is closed and there are minimized cards */}
        {!isOpen && minimizedCards.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
            {minimizedCards.length}
          </span>
        )}
      </motion.button>
    </>
  );
}
