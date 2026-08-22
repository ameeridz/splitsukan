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
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
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

  function openDeleteConfirmation() {
    setDeleteError(null);
    setShowDeleteConfirmation(true);
  }

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

      if (!deleted) {
        throw new Error("Session no longer exists.");
      }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" size={19} />
            Back to Sessions
          </Link>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/sessions/${session.id}/edit`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-surface-muted"
            >
              <Pencil aria-hidden="true" size={18} strokeWidth={2.2} />
              Edit Session
            </Link>

            <button
              type="button"
              onClick={openDeleteConfirmation}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger-surface px-4 text-sm font-semibold text-danger-foreground transition-colors hover:border-danger"
            >
              <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
              Delete Session
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-primary">
                SESSION OVERVIEW
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
                <CalendarDays aria-hidden="true" size={17} /> Date
              </dt>
              <dd className="mt-2 font-semibold">{session.date}</dd>
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

        <section className="rounded-2xl border border-dashed border-border-strong bg-surface-muted p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight">Next: participants</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Participant management will be connected in the next product
            milestone. This session is already stored locally on this device.
          </p>
        </section>
      </div>

      {showDeleteConfirmation ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeDeleteConfirmation();
            }
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
              <Trash2 aria-hidden="true" size={22} strokeWidth={2.2} />
            </span>

            <h2
              id="delete-session-title"
              className="mt-5 text-xl font-bold tracking-tight"
            >
              Delete “{activityName}” session?
            </h2>
            <p
              id="delete-session-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              This permanently removes the session from this device. Future
              participants, expenses, repayments, and payment instructions
              linked to this session would also be removed. This action cannot
              be undone.
            </p>

            {deleteError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground"
              >
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={isDeleting}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={18} />
                {isDeleting ? "Deleting..." : "Delete Session"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
