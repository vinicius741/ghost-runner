import { AlertTriangle, MapPin, X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LocationWarningProps {
  onDismiss: () => void;
  onGoToSettings: () => void;
}

export function LocationWarning({ onDismiss, onGoToSettings }: LocationWarningProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500" />
      <div className="relative flex items-center justify-between p-4 bg-slate-900 border border-amber-500/30 rounded-xl">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <MapPin className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-amber-500 font-semibold text-sm tracking-wide">Default Location in Use</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              You are using the default São Paulo location. For accurate geolocation in your automation tasks,
              please set your actual location in{' '}
              <button
                onClick={onGoToSettings}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium inline-flex items-center gap-1 transition-colors"
              >
                Settings
                <ChevronRight className="w-3 h-3" />
              </button>.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
