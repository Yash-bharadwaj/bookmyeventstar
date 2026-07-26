"use client";

import { motion } from "framer-motion";

interface ResendTimerProps {
  seconds: number;
  totalSeconds: number;
  onResend: () => void;
  disabled?: boolean;
}

/**
 * Replaces a bare "Resend in 45s" text countdown with a small depleting
 * ring — the same "how much time is left" read at a glance used elsewhere
 * in the app (profile-completeness ring), just sized for an inline row.
 */
export function ResendTimer({ seconds, totalSeconds, onResend, disabled }: ResendTimerProps) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, seconds / totalSeconds)) : 0;

  if (seconds <= 0) {
    return (
      <button
        type="button"
        onClick={onResend}
        disabled={disabled}
        className="text-gold-700 font-medium text-xs hover:text-gold-800 disabled:text-muted-foreground transition-colors"
      >
        Resend code
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium tabular-nums">
      <svg width="16" height="16" viewBox="0 0 20 20" className="-rotate-90 shrink-0">
        <circle cx="10" cy="10" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
        <motion.circle
          cx="10" cy="10" r={radius} fill="none" stroke="currentColor" strokeWidth="2"
          className="text-gold-500"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </svg>
      <span>Resend in {seconds}s</span>
    </div>
  );
}
