"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import {
  getSessionActivityName,
  type SessionRecord,
} from "../session-model";

function formatSessionDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatSessionTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return startTime;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function sortSessions(sessions: SessionRecord[]) {
  return [...sessions].sort((first, second) => {
    const firstSchedule = `${first.date}T${first.startTime}`;
    const secondSchedule = `${second.date}T${second.startTime}`;

    return secondSchedule.localeCompare(firstSchedule);
  });
}

function SessionCard({ session }: { session: SessionRecord }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className={[
        "group block rounded-2xl border border-border bg-surface p-5 shadow-sm",
        "transition-colors hover:border-border-strong hover:bg-surface-muted",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight">
            {getSessionActivityName(session)}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {session.venue}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-warning-surface px-3 py-1 text-xs font-semibold capitalize text-warning-foreground">
          {session.status}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays aria-hidden="true" size={17} />
          <dt className="sr-only">Date</dt>
          <dd>{formatSessionDate(session.date)}</dd>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 aria-hidden="true" size={17} />
          <dt className="sr-only">Start time</dt>
          <dd>{formatSessionTime(session.startTime)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold text-primary">Open session</span>
        <ChevronRight
          aria-hidden="true"
          size={19}
          className="text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
        />
      </div>
    </Link>
  );
}

export function SessionsOverview() {
  const sessions = useApplicationStore((state) => state.sessions);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const sortedSessions = sortSessions(sessions);

  if (!hasHydrated) {
    return (
      <div role="status" className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-surface-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-48 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
        <span className="sr-only">Restoring locally saved sessions...</span>
      </div>
    );
  }

  if (sortedSessions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border-strong bg-surface p-6 text-center shadow-sm sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary"
        >
          <CalendarDays size={27} strokeWidth={2.2} />
        </span>

        <h2 className="mt-5 text-xl font-bold tracking-tight">
          Create your first sports session
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Add the activity, date, time, and venue. Participants and shared
          expenses can be added after the session is created.
        </p>

        <Link
          href="/sessions/new"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus aria-hidden="true" size={19} strokeWidth={2.4} />
          New Session
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              SPLITSUKAN
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Play together. Split fairly.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your sessions are stored locally on this device and remain
              available after refresh or browser restart.
            </p>
          </div>

          <Link
            href="/sessions/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus aria-hidden="true" size={19} strokeWidth={2.4} />
            New Session
          </Link>
        </div>
      </section>

      <section aria-labelledby="saved-sessions-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="saved-sessions-title"
              className="text-xl font-bold tracking-tight"
            >
              Saved sessions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sortedSessions.length} locally saved {sortedSessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sortedSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-dashed border-border-strong bg-surface-muted p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <MapPin
            aria-hidden="true"
            size={20}
            className="mt-0.5 shrink-0 text-primary"
          />
          <div>
            <h2 className="font-bold tracking-tight">Local-first storage</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Sessions are currently available only in this browser. JSON
              backup and restore will be added before the local MVP is complete.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
