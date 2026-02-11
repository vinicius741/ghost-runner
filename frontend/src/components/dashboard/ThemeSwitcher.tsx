import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Shield, Gem, Sun, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import type { ThemeId } from '@/themes';

const themeIcons: Record<ThemeId, React.ComponentType<{ className?: string }>> = {
  'midnight-protocol': Shield,
  'obsidian-noir': Gem,
  'synthwave-sunset': Sun,
};

export function ThemeSwitcher() {
  const { theme, themeConfig, setTheme, themeList } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const CurrentIcon = themeIcons[theme];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all duration-300 group"
        aria-label="Switch theme"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CurrentIcon
          className="w-3.5 h-3.5 text-primary transition-transform group-hover:scale-110"
        />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground group-hover:text-foreground transition-colors">
          {themeConfig.name}
        </span>
        <Palette className="w-3 h-3 text-muted-foreground/50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50"
            role="listbox"
            aria-label="Theme options"
          >
            <div className="p-2 border-b border-border/30">
              <div className="flex items-center gap-2 px-2 py-1">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Select Theme
                </span>
              </div>
            </div>

            <div className="p-1.5">
              {themeList.map((config) => {
                const Icon = themeIcons[config.id];
                const isActive = theme === config.id;

                return (
                  <button
                    key={config.id}
                    onClick={() => {
                      setTheme(config.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 relative group',
                      isActive
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50 border border-transparent'
                    )}
                    role="option"
                    aria-selected={isActive}
                  >
                    {/* Color preview */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${config.colors.primary}40, ${config.colors.background})`,
                        border: `1px solid ${config.colors.primary}60`,
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {config.name}
                        </span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {config.description}
                      </span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: config.colors.primary }}
                          title="Primary"
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: config.colors.accent }}
                          title="Accent"
                        />
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                          {config.typography.display}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-border/30 bg-muted/20">
              <span className="text-[9px] text-muted-foreground/60 block text-center">
                Theme persists in browser storage
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
