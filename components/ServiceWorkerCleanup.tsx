"use client";

import { useEffect } from "react";

const RELOAD_ONCE_KEY = "bmes-sw-cleanup-reloaded";

/**
 * The site used to register a next-pwa service worker; we've dropped the PWA
 * layer entirely (this is a website, not an installed app, and the SW's
 * NetworkFirst caching was adding multi-second stalls to every navigation).
 * Removing the registration code alone doesn't help returning visitors —
 * whatever service worker they already installed keeps running and
 * intercepting requests indefinitely until something tells the browser to
 * drop it. This actively unregisters any leftover service worker and clears
 * the caches it created, once, on load.
 *
 * unregister() only stops a service worker from controlling *future*
 * navigations — it does NOT detach it from the tab that's already loaded
 * under it. For a returning visitor with a stale SW installed, the page
 * running this very cleanup is still being intercepted by it for the rest
 * of the tab's life: client-side route changes (e.g. tapping "Join as
 * Artist") keep going through the old SW's fetch handler, which can still
 * be serving JS chunks cached from before the last deploy — those 404 or
 * mismatch against the current build and the navigation renders a blank
 * page or crashes. If this load was itself SW-controlled, force one reload
 * (guarded by sessionStorage so it can't loop) so the user lands on a
 * genuinely SW-free page before they click anything.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const wasControlled = Boolean(navigator.serviceWorker.controller);

    (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (!wasControlled) return;
      try {
        // Some browsers (e.g. certain private-browsing modes) can throw on
        // storage access — this whole component exists to stop a crash, so
        // it must never become a new source of one. Worst case here is just
        // a missed reload, not a broken page.
        if (sessionStorage.getItem(RELOAD_ONCE_KEY)) return;
        sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
      } catch {
        return;
      }
      window.location.reload();
    })();
  }, []);

  return null;
}
