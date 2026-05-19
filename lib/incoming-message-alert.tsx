import toast from "react-hot-toast";
import { MessageSquare } from "lucide-react";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Two-tone ping similar to desktop message alerts */
export function playIncomingMessageSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.09, now + 0.02);

  const frequencies = [660, 880];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.08, now + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.28);
    osc.connect(g);
    g.connect(master);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.3);
  });
}

export function requestMessageNotificationPermission(): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function truncateBody(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export interface IncomingMessageAlertOptions {
  title: string;
  subtitle?: string;
  body: string;
  notificationTag: string;
  /** Prefer SVG in /public/icons for Chromium */
  notificationIcon?: string;
}

/** Toast (always) + OS notification (if permitted) + sound + light haptic */
export function showIncomingMessageAlert(opts: IncomingMessageAlertOptions): void {
  playIncomingMessageSound();

  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([18, 45, 18]);
    }
  } catch {
    /* ignore */
  }

  const shortBody = truncateBody(opts.body);

  toast.custom(
    (t) => (
      <div
        role="alert"
        className={`pointer-events-auto max-w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background/98 shadow-2xl backdrop-blur-md transition-all duration-300 ${
          t.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}
      >
        <div className="flex gap-3 p-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
            <MessageSquare className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight text-foreground">{opts.title}</p>
            {opts.subtitle ? (
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{opts.subtitle}</p>
            ) : null}
            <p className="mt-1.5 text-[13px] leading-snug text-foreground/90">{shortBody}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
          >
            ×
          </button>
        </div>
      </div>
    ),
    { duration: 6500, position: "top-right", id: `msg-${opts.notificationTag}` }
  );

  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(opts.title, {
      body: opts.subtitle ? `${opts.subtitle}\n${shortBody}` : shortBody,
      tag: opts.notificationTag,
      icon: opts.notificationIcon ?? "/icons/icon-192.svg",
      silent: true,
    });
  } catch {
    /* ignore */
  }
}
