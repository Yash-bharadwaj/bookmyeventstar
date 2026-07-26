"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isInStandaloneMode =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isInStandaloneMode) return;

    // A pure timer used to show this regardless of scroll position, which
    // meant it could pop up directly on top of the homepage hero's search
    // bar / CTAs on phone-height viewports — the single most important
    // above-the-fold content. Now it also waits for the visitor to have
    // scrolled past the hero before it's allowed to appear.
    let timerDone = false;
    let scrolledPast = window.scrollY > 400;

    const maybeShow = () => {
      if (timerDone && scrolledPast) setShowBanner(true);
    };
    const onScroll = () => {
      if (window.scrollY > 400) {
        scrolledPast = true;
        maybeShow();
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    if (isIOSDevice) {
      setIsIOS(true);
      const t = setTimeout(() => { timerDone = true; maybeShow(); }, 3000);
      return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => { timerDone = true; maybeShow(); }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80"
          >
            <div className="bg-navy-900 border border-gold-500/30 rounded-2xl p-4 shadow-2xl shadow-gold-500/10">
              <div className="flex items-start gap-3">
                <BrandLogo size="sm" frame={false} className="flex-shrink-0" imgClassName="!h-10 !max-w-[100px]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white text-sm">Install BookMyEventStar</p>
                    <button
                      onClick={handleDismiss}
                      className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                    Add to your home screen for a faster, app-like experience.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      variant="default"
                      className="flex-1 font-semibold text-xs h-8"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isIOS ? "How to Install" : "Install App"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="text-white/60 hover:text-white text-xs h-8 px-3"
                    >
                      Not now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-navy-900 border border-gold-500/30 rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Install on iPhone / iPad</h3>
                  <p className="text-white/60 text-xs">Add to Home Screen</p>
                </div>
              </div>
              <ol className="space-y-3">
                {[
                  { step: "1", text: "Tap the Share button at the bottom of your browser" },
                  { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: "3", text: 'Tap "Add" to confirm installation' },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-white/80 text-sm leading-relaxed">{text}</p>
                  </li>
                ))}
              </ol>
              <Button
                onClick={handleDismiss}
                variant="default"
                className="w-full mt-5 font-semibold"
              >
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
