"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useRef, useSyncExternalStore } from "react";
import { ChevronDown, ExternalLink, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ApplicationHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

const appearanceOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

type AppearanceValue = (typeof appearanceOptions)[number]["value"];

function subscribe() {
  return () => {};
}

export function ApplicationHeader({
  title,
  description,
  action,
}: ApplicationHeaderProps) {
  const appearanceMenuRef = useRef<HTMLDetailsElement>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { theme, setTheme } = useTheme();
  const selectedTheme = mounted ? theme ?? "system" : "system";
  const selectedOption =
    appearanceOptions.find((option) => option.value === selectedTheme) ??
    appearanceOptions[2];
  const SelectedThemeIcon = selectedOption.icon;

  function selectTheme(value: AppearanceValue) {
    setTheme(value);
    appearanceMenuRef.current?.removeAttribute("open");
  }

  return (
    <div
      className={[
        "mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center gap-3",
        "px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]",
        "sm:px-6 lg:px-8 lg:py-3",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Image
          src="/icons/icon-192x192.png"
          alt=""
          width={40}
          height={40}
          priority
          aria-hidden="true"
          className="size-10 shrink-0 rounded-2xl object-cover shadow-sm lg:hidden"
        />

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
            {title}
          </h1>

          <div className="flex min-w-0 items-center gap-2">
            {description ? (
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {description}
              </p>
            ) : null}

            <a
              href="https://ridzu.one"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Ridzjuan website"
              className={[
                "group inline-flex shrink-0 items-center gap-1 text-[11px] font-medium",
                "text-muted-foreground transition-colors hover:text-primary lg:hidden",
                "focus-visible:rounded focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-focus-ring",
              ].join(" ")}
            >
              <span>
                by <span className="font-bold">Ridzjuan</span>
              </span>
              <ExternalLink
                aria-hidden="true"
                size={11}
                className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transform-none"
              />
            </a>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {action ? <div className="hidden sm:block">{action}</div> : null}

        <details ref={appearanceMenuRef} className="group relative">
          <summary
            aria-label={`Current theme: ${selectedOption.label}. Change appearance.`}
            className={[
              "flex min-h-11 list-none items-center gap-2 rounded-xl",
              "border border-border bg-surface px-3 text-sm font-medium",
              "text-foreground shadow-sm transition-colors hover:bg-surface-muted",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background",
              "[&::-webkit-details-marker]:hidden",
            ].join(" ")}
          >
            {mounted ? (
              <SelectedThemeIcon aria-hidden="true" size={19} strokeWidth={2.2} />
            ) : (
              <span
                aria-hidden="true"
                className="size-4.75 animate-pulse rounded-full bg-surface-muted"
              />
            )}
            <span className="hidden sm:inline">
              {mounted ? selectedOption.label : "Appearance"}
            </span>
            <ChevronDown
              aria-hidden="true"
              size={16}
              className="hidden transition-transform group-open:rotate-180 sm:block"
            />
          </summary>

          <div
            className={[
              "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 overflow-hidden",
              "rounded-2xl border border-border bg-surface/95 p-2",
              "shadow-[0_1rem_3rem_var(--shadow-color)] backdrop-blur-2xl",
              "supports-backdrop-filter:bg-surface/85",
            ].join(" ")}
          >
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              Appearance
            </p>
            <div role="radiogroup" aria-label="Appearance theme" className="space-y-1">
              {appearanceOptions.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = mounted && selectedTheme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectTheme(option.value)}
                    className={[
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3",
                      "text-left text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                      isSelected
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    <OptionIcon aria-hidden="true" size={19} strokeWidth={2.2} />
                    <span className="flex-1">{option.label}</span>
                    <span
                      aria-hidden="true"
                      className={[
                        "size-2 rounded-full bg-primary transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>

      {action ? <div className="w-full sm:hidden">{action}</div> : null}
    </div>
  );
}
