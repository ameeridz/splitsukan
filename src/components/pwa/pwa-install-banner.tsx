"use client";

import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const dismissalStorageKey = "splitsukan:install-banner-dismissed-at";
const dismissalDuration = 7 * 24 * 60 * 60 * 1000;

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasRecentlyDismissed() {
  const storedValue = window.localStorage.getItem(dismissalStorageKey);
  const dismissedAt = storedValue ? Number(storedValue) : Number.NaN;

  return (
    Number.isFinite(dismissedAt) &&
    Date.now() - dismissedAt < dismissalDuration
  );
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
  if (isStandaloneMode() || wasRecentlyDismissed()) {
    return;
  }

  let animationFrameId: number | null = null;

  if (isIosDevice()) {
    animationFrameId = window.requestAnimationFrame(() => {
      setShowIosInstructions(true);
      setIsVisible(true);
    });
  }

  function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowIosInstructions(false);
      setIsVisible(true);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setIsVisible(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
  }

  window.removeEventListener(
    "beforeinstallprompt",
    handleBeforeInstallPrompt,
  );
  window.removeEventListener("appinstalled", handleAppInstalled);
};
  }, []);

  function dismissBanner() {
    window.localStorage.setItem(dismissalStorageKey, String(Date.now()));
    setIsVisible(false);
  }

  async function installApplication() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsVisible(false);
    }

    setInstallPrompt(null);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Install SplitSukan"
      className={[
        "fixed inset-x-4 z-90 mx-auto max-w-md",
        "bottom-[calc(6.75rem+env(safe-area-inset-bottom))] lg:bottom-6",
        "rounded-2xl border border-border bg-surface/95 p-3",
        "shadow-[0_1rem_3rem_var(--shadow-color)] backdrop-blur-2xl",
        "supports-backdrop-filter:bg-surface/85",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon-192x192.png"
          alt=""
          width={44}
          height={44}
          aria-hidden="true"
          className="size-11 shrink-0 rounded-xl object-cover shadow-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight">
            Install SplitSukan
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {showIosInstructions
              ? "Add to your Home Screen."
              : "Faster access from your home screen."}
          </p>
        </div>

        {showIosInstructions ? (
          <button
            type="button"
            onClick={() => setShowIosGuide((current) => !current)}
            aria-expanded={showIosGuide}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary-hover"
          >
            <Share aria-hidden="true" size={16} />
            Install
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void installApplication()}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Download aria-hidden="true" size={17} />
            Install
          </button>
        )}

        <button
          type="button"
          onClick={dismissBanner}
          aria-label="Dismiss install suggestion"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {showIosInstructions && showIosGuide ? (
        <div className="mt-3 rounded-xl bg-surface-muted p-3 text-xs leading-5 text-muted-foreground">
          <p className="font-semibold text-foreground">Install on iPhone or iPad</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Open SplitSukan in Safari.</li>
            <li>Tap the Share button in Safari.</li>
            <li>Choose Add to Home Screen, then tap Add.</li>
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
