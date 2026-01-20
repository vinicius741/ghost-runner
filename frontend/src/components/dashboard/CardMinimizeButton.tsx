import { Minus } from 'lucide-react';

interface CardMinimizeButtonProps {
  onMinimize: () => void;
  ariaLabel?: string;
}

export function CardMinimizeButton({ onMinimize, ariaLabel = 'Minimize card' }: CardMinimizeButtonProps) {
  return (
    <button
      onClick={onMinimize}
      className="absolute -top-3 -left-3 z-10 p-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-slate-700/80"
      aria-label={ariaLabel}
      type="button"
    >
      <Minus className="w-4 h-4" />
    </button>
  );
}
