/**
 * Single source of truth for chart colors (recharts needs real CSS color
 * values, not Tailwind classes, so these mirror tailwind.config.ts's
 * `gold`/`navy` scales by hand). Update both places together — this file
 * existing at all is the fix for chart colors having drifted out of sync
 * with the brand palette before.
 */
export const CHART_GOLD = "#f59e0b"; // gold-500
export const CHART_NAVY = "#3d6285"; // navy-500

// Multi-series palette (pie/bar charts with more than two categories) —
// gold and navy first since they're the brand accents, then a small set of
// clearly distinct hues for additional series.
export const CHART_SERIES = [CHART_GOLD, CHART_NAVY, "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];
