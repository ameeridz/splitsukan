"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, Plus, Settings } from "lucide-react";

function isSessionsRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/sessions" ||
    pathname.startsWith("/sessions/")
  );
}

function isReportsRoute(pathname: string) {
  return pathname === "/reports" || pathname.startsWith("/reports/");
}

function isSettingsRoute(pathname: string) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

type NavigationItemProps = {
  href: string;
  label: string;
  active: boolean;
  icon: typeof CalendarDays;
};

function NavigationItem({
  href,
  label,
  active,
  icon: Icon,
}: NavigationItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex min-h-14 min-w-0 flex-col",
        "items-center justify-center gap-1 rounded-2xl px-2",
        "text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        size={21}
        strokeWidth={active ? 2.4 : 2}
      />
      <span className="max-w-full truncate">{label}</span>
      <span
        aria-hidden="true"
        className={[
          "absolute bottom-1.5 h-1 w-1 rounded-full bg-primary",
          "transition-opacity",
          active ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </Link>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="px-4 pb-[calc(0.20rem+env(safe-area-inset-bottom))]"
    >
      <div
        className={[
          "mx-auto grid w-full max-w-md grid-cols-[1fr_1fr_auto_1fr]",
          "items-center gap-1 rounded-[1.75rem] p-2",
          "border border-border/80 bg-surface/90",
          "shadow-[0_1rem_3rem_var(--shadow-color)]",
          "backdrop-blur-2xl supports-backdrop-filter:bg-surface/75",
        ].join(" ")}
      >
        <NavigationItem
          href="/"
          label="Sessions"
          active={isSessionsRoute(pathname)}
          icon={CalendarDays}
        />

        <NavigationItem
          href="/reports"
          label="Reports"
          active={isReportsRoute(pathname)}
          icon={FileText}
        />

        <Link
          href="/sessions/new"
          aria-label="Create new session"
          className={[
            "-mt-8 flex size-16 shrink-0 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-[0_0.75rem_2rem_color-mix(in_oklch,var(--primary)_30%,transparent)]",
            "transition-transform hover:scale-[1.03] hover:bg-primary-hover",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-background",
            "motion-reduce:transform-none motion-reduce:transition-none",
          ].join(" ")}
        >
          <Plus aria-hidden="true" size={28} strokeWidth={2.4} />
        </Link>

        <NavigationItem
          href="/settings"
          label="Settings"
          active={isSettingsRoute(pathname)}
          icon={Settings}
        />
      </div>
    </nav>
  );
}
