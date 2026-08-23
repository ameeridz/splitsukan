"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  Eraser,
  HardDrive,
  ShieldAlert,
  X,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";

type StorageInformation = {
  usageBytes: number | null;
  quotaBytes: number | null;
};

function formatBytes(bytes: number | null) {
  if (bytes === null) return "Unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function LocalDataPanel() {
  const sessions = useApplicationStore((state) => state.sessions);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const restoreBackupSessions = useApplicationStore(
    (state) => state.restoreBackupSessions,
  );
  const [storageInformation, setStorageInformation] =
    useState<StorageInformation>({ usageBytes: null, quotaBytes: null });
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const participantCount = sessions.reduce(
    (total, session) => total + session.participants.length,
    0,
  );
  const financialRecordCount = sessions.reduce(
    (total, session) =>
      total + session.expenses.length + session.repayments.length,
    0,
  );
  const canConfirmClear = confirmationText.trim().toUpperCase() === "DELETE";

  useEffect(() => {
    let active = true;

    async function readStorageInformation() {
      if (!navigator.storage?.estimate) return;

      try {
        const estimate = await navigator.storage.estimate();
        if (!active) return;

        setStorageInformation({
          usageBytes: estimate.usage ?? null,
          quotaBytes: estimate.quota ?? null,
        });
      } catch (error) {
        console.warn("Unable to read browser storage information.", error);
      }
    }

    void readStorageInformation();
    return () => {
      active = false;
    };
  }, [sessions]);

  function closeConfirmation() {
    setIsConfirmingClear(false);
    setConfirmationText("");
  }

  function clearAllData() {
    if (!canConfirmClear) return;

    restoreBackupSessions([]);
    closeConfirmation();
    setSuccessMessage(
      "All locally saved SplitSukan sessions were cleared successfully.",
    );
  }

  return (
    <section
      aria-labelledby="local-data-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            LOCAL DATA
          </p>
          <h2
            id="local-data-title"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
          >
            Review and clear this device
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            SplitSukan stores session data in this browser. Export a backup
            before clearing data that may be needed later.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuccessMessage(null);
            setIsConfirmingClear(true);
          }}
          disabled={!hasHydrated || sessions.length === 0}
          className={[
            "inline-flex min-h-11 shrink-0 items-center justify-center gap-2",
            "rounded-xl border border-danger/40 bg-danger-surface px-4",
            "text-sm font-semibold text-danger-foreground transition-colors",
            "hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50",
          ].join(" ")}
        >
          <Eraser aria-hidden="true" size={18} />
          Clear All Data
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <Database aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{sessions.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">saved sessions</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <HardDrive aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{participantCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">participants</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <ShieldAlert aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{financialRecordCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            financial records
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <HardDrive aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-base font-bold">
            {formatBytes(storageInformation.usageBytes)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            browser usage
            {storageInformation.quotaBytes !== null
              ? ` of ${formatBytes(storageInformation.quotaBytes)}`
              : ""}
          </p>
        </div>
      </div>

      {successMessage ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-success-surface p-3 text-sm font-medium text-success-foreground"
        >
          {successMessage}
        </p>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Browser storage totals may include caches and other site data, not only
        the SplitSukan JSON state.
      </p>

      {isConfirmingClear ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-data-title"
            aria-describedby="clear-data-description"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-surface text-danger-foreground">
                <AlertTriangle aria-hidden="true" size={22} />
              </span>
              <button
                type="button"
                onClick={closeConfirmation}
                aria-label="Close clear data confirmation"
                className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-muted"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <h3
              id="clear-data-title"
              className="mt-5 text-xl font-bold tracking-tight"
            >
              Clear all local data?
            </h3>
            <p
              id="clear-data-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              This permanently removes {sessions.length} saved {sessions.length === 1 ? "session" : "sessions"}, {participantCount} participants, and {financialRecordCount} financial records from this browser.
            </p>

            <div className="mt-5 rounded-2xl bg-warning-surface p-4 text-warning-foreground">
              <p className="text-sm font-bold">Export a backup first</p>
              <p className="mt-1 text-xs leading-5 opacity-85">
                Cleared data cannot be recovered unless a valid JSON backup was
                downloaded beforehand.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="clear-data-confirmation" className="text-sm font-bold">
                Type DELETE to continue
              </label>
              <input
                id="clear-data-confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                autoComplete="off"
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-danger focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmation}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearAllData}
                disabled={!canConfirmClear}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Permanently Clear Data
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
