"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

/**
 * Segmented OTP entry. Handles the edge cases a plain <input maxLength={6}>
 * doesn't: per-digit auto-advance, backspace-to-previous, arrow-key nav,
 * pasting the full code into any box, and iOS/Android SMS autofill (which
 * lands the whole code in whichever box has focus, not one digit at a time —
 * same code path as paste). Boxes share width evenly via flex so narrow
 * phones shrink all six together instead of crushing one.
 */
export function OtpInput({ length = 6, value, onChange, onComplete, disabled, autoFocus, error }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const commit = (next: string[]) => {
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  const fillFrom = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;
    const next = digits.slice();
    let i = index;
    for (const ch of clean) {
      if (i >= length) break;
      next[i] = ch;
      i++;
    }
    commit(next);
    const focusIndex = Math.min(i, length - 1);
    refs.current[focusIndex]?.focus();
    if (i >= length) refs.current[length - 1]?.blur();
  };

  const handleChange = (index: number, raw: string) => {
    if (!raw) {
      const next = digits.slice();
      next[index] = "";
      commit(next);
      return;
    }
    // Single keystroke or full-code autofill/paste landing in one box — both
    // go through the same fill-forward path.
    fillFrom(index, raw);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[index - 1] = "";
      commit(next);
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    fillFrom(index, text);
  };

  const handleFocus = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    // Keep entry contiguous: jumping ahead of the first empty box redirects
    // there instead, so autofill/paste always lands in the right slot.
    // Reads live DOM values rather than the `digits` prop — the prop lags
    // one render behind a programmatic focus() called right after a
    // same-tick state update, which caused a stale index and made every
    // other keystroke get eaten.
    const liveValues = refs.current.map((el) => el?.value ?? "");
    const firstEmpty = liveValues.findIndex((v) => !v);
    if (firstEmpty !== -1 && index > firstEmpty) {
      refs.current[firstEmpty]?.focus();
    } else {
      e.target.select();
    }
  };

  return (
    <div className={cn("flex gap-2", error && "animate-[shake_0.4s_ease-in-out]")}>
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Digit ${i + 1} of ${length}`}
          disabled={disabled}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => handleFocus(i, e)}
          className={cn(
            "flex-1 min-w-0 max-w-12 aspect-square rounded-xl border bg-background text-center font-semibold",
            "text-[clamp(1rem,4.5vw,1.25rem)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:border-gold-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive text-destructive" : "border-input"
          )}
        />
      ))}
    </div>
  );
}
