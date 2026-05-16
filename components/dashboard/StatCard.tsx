"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "gold" | "blue" | "green" | "purple" | "red";
  index?: number;
}

const colorMap = {
  gold: {
    icon: "bg-gold-100 text-gold-700",
    trend: "text-gold-600",
    glow: "shadow-gold-100",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700",
    trend: "text-blue-600",
    glow: "shadow-blue-100",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700",
    trend: "text-emerald-600",
    glow: "shadow-emerald-100",
  },
  purple: {
    icon: "bg-purple-100 text-purple-700",
    trend: "text-purple-600",
    glow: "shadow-purple-100",
  },
  red: {
    icon: "bg-red-100 text-red-700",
    trend: "text-red-600",
    glow: "shadow-red-100",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "gold",
  index = 0,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5",
        `hover:shadow-${colors.glow}`
      )}
    >
      {/* Background decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-current" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-display font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", colors.trend)}>
              {trend.value >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-2xl", colors.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
