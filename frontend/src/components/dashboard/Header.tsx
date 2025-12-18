import { motion } from "framer-motion";

export function Header() {
  return (
    <header className="text-center mb-12 relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-300 to-slate-500 mb-4">
          Ghost Runner <span className="text-blue-500 text-glow">Command Center</span>
        </h1>
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-slate-800" />
          <p className="text-slate-400 text-lg font-light tracking-wide">
            Advanced Automation & Task Management
          </p>
          <span className="h-px w-8 bg-slate-800" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute -top-4 right-0 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">System Online</span>
      </motion.div>
    </header>
  );
}

