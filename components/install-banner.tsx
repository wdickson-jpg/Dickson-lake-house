"use client";

import { useEffect, useState } from "react";

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    // Don't show if already installed as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone: boolean }).standalone;
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem("install-dismissed", Date.now().toString());
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-lake-deep text-white rounded-2xl p-4 shadow-lg z-50 flex items-start gap-3">
      <span className="text-2xl">📲</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install the app</p>
        <p className="text-xs text-white/70 mt-0.5">
          {isIOS
            ? "Tap the Share button, then \"Add to Home Screen\""
            : "Tap the menu, then \"Add to Home Screen\""}
        </p>
      </div>
      <button onClick={dismiss} className="text-white/50 text-lg leading-none mt-0.5">
        &times;
      </button>
    </div>
  );
}
