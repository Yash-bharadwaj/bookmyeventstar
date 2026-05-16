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
  color?: "indigo" | "blue" | "green" | "purple" | "red" | "gold" | "amber";
  index?: number;
}

const colorMap = {
  indigo: {
    icon: "bg-indigo-100 text-indigo-700",
    trend: "text-indigo-600",
    border: "hover:border-indigo-300",
    shadow: "hover:shadow-indigo-100",
    bg: "indigo",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700",
    trend: "text-blue-600",
    border: "hover:border-blue-300",
    shadow: "hover:shadow-blue-100",
    bg: "blue",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700",
    trend: "text-emerald-600",
    border: "hover:border-emerald-300",
    shadow: "hover:shadow-emerald-100",
    bg: "emerald",
  },
  purple: {
    icon: "bg-purple-100 text-purple-700",
    trend: "text-purple-600",
    border: "hover:border-purple-300",
    shadow: "hover:shadow-purple-100",
    bg: "purple",
  },
  red: {
    icon: "bg-red-100 text-red-700",
    trend: "text-red-600",
    border: "hover:border-red-300",
    shadow: "hover:shadow-red-100",
    bg: "red",
  },
  gold: {
    icon: "bg-amber-100 text-amber-700",
    trend: "text-amber-600",
    border: "hover:border-amber-300",
    shadow: "hover:shadow-amber-100",
    bg: "amber",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    trend: "text-amber-600",
    border: "hover:border-amber-300",
    shadow: "hover:shadow-amber-100",
    bg: "amber",
  },
};

const shadowColors: Record<string, string> = {
  indigo: "rgba(99,102,241,0.15)",
  blue: "rgba(59,130,246,0.15)",
  emerald: "rgba(16,185,129,0.15)",
  purple: "rgba(168,85,247,0.15)",
  red: "rgba(239,68,68,0.15)",
  amber: "rgba(245,158,11,0.15)",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "indigo",
  index = 0,
}: StatCardProps) {
  const colors = colorMap[color];
  const shadowColor = shadowColors[colors.bg];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: `0 8px 30px ${shadowColor}` }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-colors cursor-default",
        colors.border
      )}
    >
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
