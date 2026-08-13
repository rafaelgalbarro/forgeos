"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js for ForgeOS Investment PWA (shell cache only).
 * No-op when serviceWorker unsupported (e.g. some iOS Safari versions / insecure origins).
 */
export function RegisterInvestmentServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.warn("[PWA] service worker registration failed:", err);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
