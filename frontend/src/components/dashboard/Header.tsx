import { motion } from "framer-motion";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  return (
    <header className="text-center mb-12 relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground via-foreground/70 to-foreground/40 mb-4 font-display">
          Ghost Runner <span className="text-primary text-glow">Command Center</span>
        </h1>
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-border" />
          <p className="text-muted-foreground text-lg font-light tracking-wide">
            Advanced Automation & Task Management
          </p>
          <span className="h-px w-8 bg-border" />
        </div>
      </motion.div>

      <div className="absolute -top-4 right-0 flex items-center gap-3">
        <ThemeSwitcher />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">System Online</span>
        </motion.div>
      </div>
    </header>
  );
}

