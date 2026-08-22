"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import type { SessionFormValues } from "../session-form-model";
import type { SessionRecord } from "../session-model";
import { SessionForm } from "./session-form";

type EditSessionViewProps = {
  sessionId: string;
};

function getInitialValues(session: SessionRecord): SessionFormValues {
  return {
    activityType: session.activityType,
    customActivityName: session.customActivityName ?? "",
    date: session.date,
    startTime: session.startTime,
    venue: session.venue,
    note: session.note ?? "",
  };
}

export function EditSessionView({ sessionId }: EditSessionViewProps) {
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );

  if (!hasHydrated) {
    return (
      <div role="status" className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-surface-muted" />
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
          This session cannot be edited because it is not available on this device.
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

  return (
    <div className="space-y-6">
      <Link
        href={`/sessions/${session.id}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" size={19} />
        Back to Session
      </Link>

      <SessionForm
        mode="edit"
        sessionId={session.id}
        initialValues={getInitialValues(session)}
      />
    </div>
  );
}
