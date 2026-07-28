"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-2xl border bg-gradient-to-br from-gold-50 to-amber-50 border-gold-200 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-navy-900">Share your profile</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share this link and get discovered — post it on Instagram, WhatsApp status, or anywhere else you promote your work.
          </p>
          {!isLive && (
            <p className="text-xs text-amber-700 mt-1.5">
              This link will go live once your profile is verified and listed.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 bg-white rounded-xl border px-3 py-2">
            <span className="text-sm text-navy-900 truncate flex-1">{displayLink}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              Copy Link
            </Button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">Share on WhatsApp</Button>
            </a>
            {canShare && (
              <Button size="sm" variant="outline" onClick={shareNative}>
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
