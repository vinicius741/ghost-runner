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
            className="fixed right-0 top-0 bottom-0 z-40 w-48 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col"
            style={{ width: `${SIDEBAR_WIDTH_REM}rem` }}
          >
            {/* Header */}
            <div className="p-3 border-b border-slate-800">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minimized</h2>
            </div>

            {/* Minimized Cards List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {minimizedCards.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
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
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 text-left transition-colors group"
                        type="button"
                      >
                        <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-slate-200 flex-shrink-0" />
                        <span className="text-sm text-slate-300 group-hover:text-slate-100 truncate flex-1">
                          {metadata.displayName}
                        </span>
                        <Maximize2 className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
        className="fixed top-4 z-50 h-10 w-10 flex items-center justify-center rounded-l-lg bg-slate-800/90 backdrop-blur-sm border border-l border-t border-b border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700/90 transition-colors"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        type="button"
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </motion.button>
    </>
  );
}
