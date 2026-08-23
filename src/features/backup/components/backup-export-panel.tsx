"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileJson,
  ReceiptText,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  createBackupFileName,
  createBackupSummary,
  createSplitsukanBackup,
  serializeSplitsukanBackup,
} from "../backup-model";
import {
  applicationSchemaVersion,
  useApplicationStore,
} from "../../../stores/application-store";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function BackupExportPanel() {
  const sessions = useApplicationStore((state) => state.sessions);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      createBackupSummary(
        createSplitsukanBackup({
          applicationSchemaVersion,
          sessions,
          createdAt: new Date().toISOString(),
        }),
      ),
    [sessions],
  );

  function downloadBackup(content: string, fileName: string) {
    const blob = new Blob([content], {
      type: "application/json;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }

  function handleExportBackup() {
    if (isExporting || !hasHydrated) return;

    setIsExporting(true);
    setError(null);

    try {
      const createdAt = new Date().toISOString();
      const backup = createSplitsukanBackup({
        applicationSchemaVersion,
        sessions,
        createdAt,
      });

      downloadBackup(
        serializeSplitsukanBackup(backup),
        createBackupFileName(createdAt),
      );
      setLastExportedAt(createdAt);
    } catch (exportError) {
      console.error("Unable to export the SplitSukan backup.", exportError);
      setError(
        "The backup could not be exported. Please try again on this device.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section
      aria-labelledby="backup-export-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            DATA BACKUP
          </p>
          <h2
            id="backup-export-title"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
          >
            Export your local data
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Download a versioned JSON copy of every locally saved session,
            participant, expense, allocation, repayment, and settlement state.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          disabled={!hasHydrated || isExporting}
          className={[
            "inline-flex min-h-11 shrink-0 items-center justify-center gap-2",
            "rounded-xl bg-primary px-5 text-sm font-semibold",
            "text-primary-foreground transition-colors hover:bg-primary-hover",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
            "focus-visible:ring-offset-surface disabled:cursor-wait",
            "disabled:opacity-60",
          ].join(" ")}
        >
          <Download aria-hidden="true" size={18} />
          {isExporting ? "Exporting..." : "Export Backup"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <FileJson aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{summary.sessionCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.sessionCount === 1 ? "session" : "sessions"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <UsersRound aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{summary.participantCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">participants</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <WalletCards aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{summary.expenseCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">expenses</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <ReceiptText aria-hidden="true" size={18} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{summary.repaymentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">repayments</p>
        </div>
      </div>

      {!hasHydrated ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Restoring local data before export...
        </p>
      ) : null}

      {lastExportedAt ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl bg-success-surface p-3 text-sm font-medium text-success-foreground"
        >
          <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          Backup downloaded successfully on {formatDateTime(lastExportedAt)}.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Keep the JSON file somewhere safe. Restore support will be added next,
        and restoring will always require validation, preview, and confirmation.
      </p>
    </section>
  );
}
