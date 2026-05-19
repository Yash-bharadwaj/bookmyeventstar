"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArtistProfileCompletionItem } from "@/lib/artist-profile-completion";

interface ProfileCompletionGaugeProps {
  percent: number;
  isComplete: boolean;
  items: ArtistProfileCompletionItem[];
  verified: boolean;
  listed: boolean;
  showOnExplore: boolean;
  className?: string;
}

/** Ring gauge + checklist for artist profile completeness. */
export function ProfileCompletionGauge({
  percent,
  isComplete,
  items,
  verified,
  listed,
  showOnExplore,
  className,
}: ProfileCompletionGaugeProps) {
  const radius = 44;
  const stroke = 7;
  const c = 2 * Math.PI * radius;
  const offset = c - (percent / 100) * c;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-navy-900 via-navy-900 to-indigo-950 text-white shadow-lg overflow-hidden",
        className
      )}
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="relative w-[7.25rem] h-[7.25rem] shrink-0">
            <svg className="-rotate-90 w-full h-full" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={isComplete ? "#34d399" : "#eab308"}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
              <span className="text-3xl font-display font-bold leading-none">{percent}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/55 mt-0.5">complete</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
              <h3 className="font-display font-bold text-lg">Your profile completeness</h3>
            </div>
            <p className="text-sm text-white/70 leading-snug">
              You appear on the artist directory only when everything below is done, your account is verified, and the team
              lists your profile.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
              <StatusPill ok={isComplete} label="Checklist done" />
              <StatusPill ok={verified} label="Verified" />
              <StatusPill ok={listed} label="Listed by admin" />
              <StatusPill ok={showOnExplore} label="Live on explore" emphasize />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white/[0.06] border-t border-white/10 px-5 py-3 sm:px-6">
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-2 text-xs rounded-lg px-3 py-2",
                item.done ? "bg-emerald-500/15 text-emerald-50" : "bg-white/5 text-white/75"
              )}
            >
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
              ) : (
                <Circle className="w-4 h-4 text-white/35 shrink-0 mt-px" />
              )}
              <span>
                <span className="font-semibold">{item.label}</span>
                <span className="text-white/55"> — {item.hint}</span>
              </span>
            </li>
          ))}
        </ul>
        {!showOnExplore && (
          <p className="text-[11px] text-amber-200/90 mt-3">
            {!isComplete && (
              <>
                Finish the checklist to unlock directory eligibility —{" "}
                <Link href="/artist/profile" className="underline underline-offset-2 hover:text-white">
                  scroll to each section below
                </Link>
                .
              </>
            )}
            {isComplete && !verified && "Profile checklist is ready. After verification we can enable listing."}
            {isComplete && verified && !listed && "You’re verified. Admin will toggle listing when ready."}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ ok, label, emphasize }: { ok: boolean; label: string; emphasize?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold border",
        ok
          ? emphasize
            ? "bg-emerald-500/25 border-emerald-400/60 text-emerald-100"
            : "bg-white/10 border-white/25 text-emerald-100"
          : "border-white/20 text-white/50"
      )}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3 opacity-60" />}
      {label}
    </span>
  );
}
