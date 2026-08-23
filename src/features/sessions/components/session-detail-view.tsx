"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  NotebookText,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import { formatSessionDate } from "../session-date-format";
import { getSessionActivityName } from "../session-model";

type SessionDetailViewProps = {
  sessionId: string;
};

export function SessionDetailView({ sessionId }: SessionDetailViewProps) {
  const router = useRouter();
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const deleteSession = useApplicationStore((state) => state.deleteSession);
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (showDeleteConfirmation) {
      cancelDeleteButtonRef.current?.focus();
    }
  }, [showDeleteConfirmation]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && showDeleteConfirmation && !isDeleting) {
        setShowDeleteConfirmation(false);
        setDeleteError(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDeleting, showDeleteConfirmation]);

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
  const activeParticipantCount = session.participants.filter(
    (participant) => participant.isActive,
  ).length;

  function closeDeleteConfirmation() {
    if (isDeleting) return;
    setDeleteError(null);
    setShowDeleteConfirmation(false);
  }

  function handleDeleteSession() {
    if (isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const deleted = deleteSession(sessionId);
      if (!deleted) throw new Error("Session no longer exists.");
      router.push("/");
    } catch (error) {
      console.error("Unable to delete the SplitSukan session.", error);
      setDeleteError(
        "The session could not be deleted. Please close this message and try again.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" size={19} />
          Back to Sessions
        </Link>

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-primary">
                SESSION OVERVIEW
              </p>
              <h2 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {activityName}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage participants, then record shared expenses.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-warning-surface px-3 py-1.5 text-xs font-semibold capitalize text-warning-foreground">
                {session.status}
              </span>

              <Link
                href={`/sessions/${session.id}/edit`}
                aria-label={`Edit ${activityName} session`}
                title="Edit Session"
                className={[
                  "flex size-10 items-center justify-center rounded-xl",
                  "border border-border-strong bg-surface text-muted-foreground",
                  "shadow-sm transition-colors hover:bg-surface-muted hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-surface",
                ].join(" ")}
              >
                <Pencil aria-hidden="true" size={18} strokeWidth={2.2} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteConfirmation(true);
                }}
                aria-label={`Delete ${activityName} session`}
                title="Delete Session"
                className={[
                  "flex size-10 items-center justify-center rounded-xl",
                  "border border-danger/40 bg-danger-surface text-danger-foreground",
                  "transition-colors hover:border-danger",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-danger focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-surface",
                ].join(" ")}
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <dl className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <CalendarDays aria-hidden="true" size={17} /> Date
              </dt>
              <dd className="mt-2 font-semibold">{formatSessionDate(session.date)}</dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <Clock3 aria-hidden="true" size={17} /> Start time
              </dt>
              <dd className="mt-2 font-semibold">{session.startTime}</dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <MapPin aria-hidden="true" size={17} /> Venue
              </dt>
              <dd className="mt-2 wrap-break-word font-semibold">
                {session.venue}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <UsersRound aria-hidden="true" size={17} /> Participants
              </dt>
              <dd className="mt-2 font-semibold">
                {activeParticipantCount}{" "}
                {activeParticipantCount === 1 ? "participant" : "participants"}
              </dd>
            </div>
            {session.note ? (
              <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                  <NotebookText aria-hidden="true" size={17} /> Note
                </dt>
                <dd className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6">
                  {session.note}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {showDeleteConfirmation ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDeleteConfirmation();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
            aria-describedby="delete-session-description"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)] sm:p-6"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-surface text-danger-foreground">
              <Trash2 aria-hidden="true" size={22} />
            </span>
            <h2 id="delete-session-title" className="mt-5 text-xl font-bold tracking-tight">
              Delete “{activityName}” session?
            </h2>
            <p id="delete-session-description" className="mt-2 text-sm leading-6 text-muted-foreground">
              This permanently removes the session and all participant data from
              this device. This action cannot be undone.
            </p>
            {deleteError ? (
              <p role="alert" className="mt-4 rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={isDeleting}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Session"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
