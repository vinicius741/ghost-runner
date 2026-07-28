import { motion } from "framer-motion";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  return (
    <header className="flex items-center justify-between mb-8 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-sm relative z-50">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-emerald-500/5 pointer-events-none rounded-2xl" />

      {/* Left section: Identity */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex items-center gap-4 relative z-10"
      >
        <motion.div
          className="relative"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.04 }}
        >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <img
            src="/logo.png"
            alt="Ghost Runner"
            className="w-12 h-12 rounded-xl relative z-10 border border-primary/20 shadow-md shadow-primary/10"
          />
        </motion.div>

        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 font-display leading-tight">
            Ghost Runner <span className="text-primary text-glow drop-shadow-sm">Command Center</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            <p className="text-muted-foreground text-xs font-medium tracking-wide">
              Advanced Automation & Task Management
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right section: Controls & Status */}
      <motion.div
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex items-center gap-4 relative z-10"
      >
        <ThemeSwitcher />
      </motion.div>
    </header>
  );
}

