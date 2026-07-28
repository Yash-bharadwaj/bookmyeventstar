"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, CheckCircle2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";

export function ShareProfileCard({ slug, isLive }: { slug: string; isLive: boolean }) {
  const [copied, setCopied] = useState(false);
  // Checked post-mount (not during render) so server and client render the
  // same markup on first paint — `navigator` differs between the two and
  // reading it directly during render would cause a hydration mismatch.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const link = `${SITE_URL}/artists/${slug}`;
  const displayLink = link.replace(/^https?:\/\//, "");
  const shareMessage = "Check out my profile on BookMyEventStar and book me for your next event!";

  const copyLink = async () => {
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
    try {
      await navigator.share({ title: "My BookMyEventStar profile", text: shareMessage, url: link });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${link}`)}`;

  return (
    <div className="rounded-xl border border-gold-200 bg-gold-50/50 px-3 py-2 flex items-center gap-2">
      <Share2 className="w-4 h-4 text-gold-600 shrink-0" />
      <span className="text-sm text-navy-900 truncate flex-1 min-w-0">
        <span className="font-medium">Your profile:</span>{" "}
        <span className="text-muted-foreground">{displayLink}</span>
        {!isLive && <span className="text-amber-700"> · pending approval</span>}
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
  );
}
