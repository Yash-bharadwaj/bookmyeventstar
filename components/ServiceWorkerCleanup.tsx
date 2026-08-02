"use client";

import { useEffect } from "react";

/**
 * The site used to register a next-pwa service worker; we've dropped the PWA
 * layer entirely (this is a website, not an installed app, and the SW's
 * NetworkFirst caching was adding multi-second stalls to every navigation).
 * Removing the registration code alone doesn't help returning visitors —
 * whatever service worker they already installed keeps running and
 * intercepting requests indefinitely until something tells the browser to
 * drop it. This actively unregisters any leftover service worker and clears
 * the caches it created, once, on load.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, []);

  return null;
}
