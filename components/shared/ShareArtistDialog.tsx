"use client";

import { useEffect, useState } from "react";
import { Copy, CheckCircle2, MessageCircle, Share2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/**
 * Admin/coordinator "share externally" action — generates a price-free,
 * revocable link to one or more artists' profiles for pasting into WhatsApp
 * or another outside channel. Mirrors the copy/WhatsApp/native-share button
 * layout from components/artist/ShareProfileCard.tsx, but that component
 * takes a pre-existing artist-owned link as a prop; this one calls the
 * /api/share-links endpoint to mint a fresh token-based link server-side.
 */
export function ShareArtistDialog({
  open,
  onOpenChange,
  artistNames,
  artistIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistNames: string[];
  artistIds: string[];
}) {
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    if (!open) {
      setLabel("");
      setLink(null);
      setGenerating(false);
      setCopied(false);
    }
  }, [open]);

  const generateLink = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistIds, label: label.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate link");
      setLink(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate link");
    }
    setGenerating(false);
  };

  const shareMessage =
    artistNames.length === 1
      ? `Check out ${artistNames[0]}'s profile on BookMyEventStar:`
      : `Check out these artist profiles on BookMyEventStar:`;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link — please copy it manually.");
    }
  };

  const shareNative = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: "Artist profile — BookMyEventStar", text: shareMessage, url: link });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  const whatsappHref = link
    ? `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${link}`)}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Share {artistNames.length === 1 ? artistNames[0] + "'s profile" : `${artistNames.length} profiles`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Generates a link with no pricing shown — safe to send to anyone outside the platform.
        </p>

        {!link ? (
          <>
            <div>
              <label className="text-sm font-medium text-navy-900 block mb-1">Note (optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. WhatsApp enquiry — Aug wedding"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <p className="text-xs text-muted-foreground mt-1">Just for your reference — not shown to whoever opens the link.</p>
            </div>
            <DialogFooter>
              <button
                onClick={generateLink}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-navy-950 font-medium px-5 py-2.5 transition-colors"
              >
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate link
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gold-200 bg-gold-50/50 px-3 py-2 flex items-center gap-2">
              <span className="text-sm text-navy-900 truncate flex-1 min-w-0">
                {link.replace(/^https?:\/\//, "")}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={copyLink}
                  title="Copy link"
                  className="p-1.5 rounded-lg text-navy-700 hover:bg-white/70 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Share on WhatsApp"
                  className="p-1.5 rounded-lg text-navy-700 hover:bg-white/70 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                {canShare && (
                  <button
                    onClick={shareNative}
                    title="Share"
                    className="p-1.5 rounded-lg text-navy-700 hover:bg-white/70 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center justify-center rounded-xl border border-navy-200 text-navy-900 font-medium px-5 py-2.5 hover:bg-navy-50 transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
