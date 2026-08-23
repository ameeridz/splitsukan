"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  FileJson,
  FolderOpen,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import type {
  BackupSummary,
  SplitsukanBackupFile,
} from "../backup-model";
import {
  getBackupValidationMessage,
  maximumBackupFileSizeBytes,
  parseSplitsukanBackup,
} from "../backup-validation";
import {
  applicationSchemaVersion,
  useApplicationStore,
} from "../../../stores/application-store";

type SelectedBackup = {
  fileName: string;
  fileSizeBytes: number;
  backup: SplitsukanBackupFile;
  summary: BackupSummary;
};

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupRestorePreviewPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentSessionCount = useApplicationStore(
    (state) => state.sessions.length,
  );
  const restoreBackupSessions = useApplicationStore(
    (state) => state.restoreBackupSessions,
  );
  const [isReading, setIsReading] = useState(false);
  const [selectedBackup, setSelectedBackup] =
    useState<SelectedBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  function clearSelection() {
    setSelectedBackup(null);
    setError(null);
    setRestoreSuccess(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function confirmRestore() {
    if (!selectedBackup) return;

    restoreBackupSessions(selectedBackup.backup.sessions);
    setRestoreSuccess(
      `Restore completed successfully. ${selectedBackup.summary.sessionCount} ${
        selectedBackup.summary.sessionCount === 1 ? "session was" : "sessions were"
      } restored.`,
    );
    setSelectedBackup(null);
    setIsConfirmingRestore(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    setSelectedBackup(null);
    setError(null);
    setRestoreSuccess(null);

    try {
      if (file.size > maximumBackupFileSizeBytes) {
        setError(getBackupValidationMessage("file-too-large"));
        event.target.value = "";
        return;
      }

      const content = await file.text();
      const result = parseSplitsukanBackup({
        content,
        fileSizeBytes: file.size,
        currentApplicationSchemaVersion: applicationSchemaVersion,
      });

      if (!result.ok) {
        setError(getBackupValidationMessage(result.reason));
        event.target.value = "";
        return;
      }

      setSelectedBackup({
        fileName: file.name,
        fileSizeBytes: file.size,
        backup: result.backup,
        summary: result.summary,
      });
    } catch (selectionError) {
      console.error("Unable to read the SplitSukan backup file.", selectionError);
      setError("The selected backup file could not be read on this device.");
      event.target.value = "";
    } finally {
      setIsReading(false);
    }
  }

  return (
    <section
      aria-labelledby="backup-restore-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            RESTORE BACKUP
          </p>
          <h2
            id="backup-restore-title"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
          >
            Select and preview a backup
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a SplitSukan JSON backup. The file will be validated and
            previewed without replacing any current local data.
          </p>
        </div>

        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelection}
            className="sr-only"
            id="backup-file-input"
          />
          <label
            htmlFor="backup-file-input"
            className={[
              "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2",
              "rounded-xl border border-border-strong bg-surface px-5",
              "text-sm font-semibold text-foreground transition-colors",
              "hover:bg-surface-muted focus-within:ring-2",
              "focus-within:ring-focus-ring focus-within:ring-offset-2",
              isReading ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <FolderOpen aria-hidden="true" size={18} />
            {isReading ? "Validating..." : "Choose Backup File"}
          </label>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-4 text-xs leading-5 text-muted-foreground">
        Accepted format: SplitSukan JSON backup · Maximum size: 5 MB · Current
        application schema: {applicationSchemaVersion}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground"
        >
          {error}
        </p>
      ) : null}

      {restoreSuccess ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl bg-success-surface p-3 text-sm font-medium text-success-foreground"
        >
          <ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          {restoreSuccess}
        </p>
      ) : null}

      {selectedBackup ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl bg-success-surface p-4 text-success-foreground sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" size={22} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Valid SplitSukan backup</p>
                <p className="mt-1 break-all text-xs leading-5 opacity-85">
                  {selectedBackup.fileName} · {formatFileSize(selectedBackup.fileSizeBytes)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-surface px-3 text-xs font-semibold text-foreground"
            >
              <X aria-hidden="true" size={15} />
              Clear
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <FileJson aria-hidden="true" size={18} className="text-primary" />
              <p className="mt-3 text-2xl font-bold">
                {selectedBackup.summary.sessionCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">sessions</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <UsersRound aria-hidden="true" size={18} className="text-primary" />
              <p className="mt-3 text-2xl font-bold">
                {selectedBackup.summary.participantCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">participants</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <WalletCards aria-hidden="true" size={18} className="text-primary" />
              <p className="mt-3 text-2xl font-bold">
                {selectedBackup.summary.expenseCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">expenses</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <ReceiptText aria-hidden="true" size={18} className="text-primary" />
              <p className="mt-3 text-2xl font-bold">
                {selectedBackup.summary.repaymentCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">repayments</p>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <CalendarClock aria-hidden="true" size={16} /> Backup created
              </dt>
              <dd className="mt-2 text-sm font-semibold">
                {formatDateTime(selectedBackup.summary.createdAt)}
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                Application schema
              </dt>
              <dd className="mt-2 text-sm font-semibold">
                Version {selectedBackup.summary.applicationSchemaVersion}
              </dd>
            </div>
          </dl>

          <div className="rounded-2xl border border-warning/40 bg-warning-surface p-4 text-warning-foreground">
            <p className="flex items-center gap-2 text-sm font-bold">
              <RotateCcw aria-hidden="true" size={18} /> Ready to restore
            </p>
            <p className="mt-1 text-xs leading-5 opacity-85">
              Current local data has not changed yet. Restoring will fully
              replace {currentSessionCount} current {currentSessionCount === 1 ? "session" : "sessions"}
              with {selectedBackup.summary.sessionCount} backup {selectedBackup.summary.sessionCount === 1 ? "session" : "sessions"}.
            </p>
            <button
              type="button"
              onClick={() => setIsConfirmingRestore(true)}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <RotateCcw aria-hidden="true" size={17} />
              Restore Backup
            </button>
          </div>
        </div>
      ) : null}
      {isConfirmingRestore && selectedBackup ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restore-confirmation-title"
            aria-describedby="restore-confirmation-description"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)]"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-surface text-danger-foreground">
              <AlertTriangle aria-hidden="true" size={22} />
            </span>
            <h3
              id="restore-confirmation-title"
              className="mt-5 text-xl font-bold tracking-tight"
            >
              Replace current local data?
            </h3>
            <p
              id="restore-confirmation-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              This will permanently replace {currentSessionCount} current {currentSessionCount === 1 ? "session" : "sessions"}
              with {selectedBackup.summary.sessionCount} {selectedBackup.summary.sessionCount === 1 ? "session" : "sessions"}
              from the selected backup. Export the current data first if it needs to be kept.
            </p>
            <div className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Current sessions</span>
                <strong>{currentSessionCount}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Backup sessions</span>
                <strong>{selectedBackup.summary.sessionCount}</strong>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmingRestore(false)}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                Replace and Restore
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
