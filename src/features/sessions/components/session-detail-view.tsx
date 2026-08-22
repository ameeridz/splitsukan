"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  NotebookText,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import { getSessionActivityName } from "../session-model";

type SessionDetailViewProps = {
  sessionId: string;
};

export function SessionDetailView({ sessionId }: SessionDetailViewProps) {
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );

  if (!hasHydrated) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded bg-surface-muted" />
        <p className="mt-5 text-sm text-muted-foreground">
          Restoring local session data...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="rounded-3xl border border-danger/40 bg-danger-surface p-6 text-danger-foreground shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Session not found</h2>
        <p className="mt-2 text-sm leading-6 opacity-85">
          This session is not available on this device. The local data may have
          been cleared, or the link may belong to another browser.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-foreground"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Sessions
        </Link>
      </section>
    );
  }

  const activityName = getSessionActivityName(session);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" size={19} />
        Back to Sessions
      </Link>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              SESSION CREATED
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {activityName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add participants next, then record shared expenses.
            </p>
          </div>
          <span className="w-fit rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold capitalize text-warning-foreground">
            {session.status}
          </span>
        </div>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <CalendarDays aria-hidden="true" size={17} />
              Date
            </dt>
            <dd className="mt-2 font-semibold">{session.date}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <Clock3 aria-hidden="true" size={17} />
              Start time
            </dt>
            <dd className="mt-2 font-semibold">{session.startTime}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <MapPin aria-hidden="true" size={17} />
              Venue
            </dt>
            <dd className="mt-2 wrap-break-word font-semibold">
              {session.venue}
            </dd>
          </div>
          {session.note ? (
            <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <NotebookText aria-hidden="true" size={17} />
                Note
              </dt>
              <dd className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6">
                {session.note}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-dashed border-border-strong bg-surface-muted p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight">Next: participants</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Participant management will be connected in the next product
          milestone. This session is already stored locally on this device.
        </p>
      </section>
    </div>
  );
}
