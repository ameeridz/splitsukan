"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Plus,
  Settings,
} from "lucide-react";

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

export function DesktopSidebar() {
  const pathname = usePathname();
  const sessionsActive = isSessionsRoute(pathname);
  const reportsActive = isReportsRoute(pathname);
  const settingsActive = isSettingsRoute(pathname);

  return (
    <nav
      aria-label="Primary navigation"
      className="flex h-full flex-col px-4 py-5"
    >
      <Link
        href="/"
        aria-label="SplitSukan home"
        className={[
          "flex items-center gap-3 rounded-2xl px-3 py-2",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
          "focus-visible:ring-offset-surface",
        ].join(" ")}
      >
        <Image
          src="/icons/icon-192x192.png"
          alt=""
          width={44}
          height={44}
          priority
          aria-hidden="true"
          className="size-11 shrink-0 rounded-2xl object-cover shadow-sm"
        />

        <span className="min-w-0">
          <span className="block truncate text-base font-bold tracking-tight">
            SplitSukan
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Play together. Split fairly.
          </span>
        </span>
      </Link>

      <Link
        href="/sessions/new"
        className={[
          "mt-7 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4",
          "bg-primary text-sm font-semibold text-primary-foreground",
          "transition-colors hover:bg-primary-hover",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
          "focus-visible:ring-offset-surface",
        ].join(" ")}
      >
        <Plus aria-hidden="true" size={19} strokeWidth={2.4} />
        <span>New Session</span>
      </Link>

      <div className="mt-7 space-y-1">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          Workspace
        </p>

        <Link
          href="/"
          aria-current={sessionsActive ? "page" : undefined}
          className={[
            "flex min-h-11 items-center gap-3 rounded-xl px-3",
            "text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface",
            sessionsActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          ].join(" ")}
        >
          <CalendarDays
            aria-hidden="true"
            size={20}
            strokeWidth={sessionsActive ? 2.4 : 2}
          />
          <span>Sessions</span>
        </Link>

        <Link
          href="/reports"
          aria-current={reportsActive ? "page" : undefined}
          className={[
            "flex min-h-11 items-center gap-3 rounded-xl px-3",
            "text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface",
            reportsActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          ].join(" ")}
        >
          <FileText
            aria-hidden="true"
            size={20}
            strokeWidth={reportsActive ? 2.4 : 2}
          />
          <span>Reports</span>
        </Link>

        <Link
          href="/settings"
          aria-current={settingsActive ? "page" : undefined}
          className={[
            "flex min-h-11 items-center gap-3 rounded-xl px-3",
            "text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface",
            settingsActive
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          ].join(" ")}
        >
          <Settings
            aria-hidden="true"
            size={20}
            strokeWidth={settingsActive ? 2.4 : 2}
          />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-sm font-semibold text-foreground">Local MVP</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Sessions and reports stay on this device until cloud sharing is
            added in a later phase.
          </p>
        </div>

        <a
          href="https://ridzu.one"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Ridzjuan website"
          className={[
            "group flex min-h-11 items-center justify-between rounded-xl px-3",
            "text-xs font-medium text-muted-foreground transition-colors",
            "hover:bg-surface-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface",
          ].join(" ")}
        >
          <span>
            Built by <span className="font-bold text-primary">Ridzjuan</span>
          </span>
          <ExternalLink
            aria-hidden="true"
            size={15}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
          />
        </a>
      </div>
    </nav>
  );
}
