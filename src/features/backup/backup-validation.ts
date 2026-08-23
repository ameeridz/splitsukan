import { restorePersistedApplicationState } from "../../stores/application-persistence";
import {
  createBackupSummary,
  currentBackupVersion,
  splitsukanBackupFormat,
  type BackupSummary,
  type SplitsukanBackupFile,
} from "./backup-model";

export const maximumBackupFileSizeBytes = 5 * 1024 * 1024;

export type BackupValidationFailureReason =
  | "empty-file"
  | "file-too-large"
  | "invalid-json"
  | "invalid-format"
  | "unsupported-backup-version"
  | "unsupported-schema-version"
  | "invalid-created-at"
  | "invalid-data";

export type BackupValidationResult =
  | {
      ok: true;
      backup: SplitsukanBackupFile;
      summary: BackupSummary;
    }
  | {
      ok: false;
      reason: BackupValidationFailureReason;
    };

type ParseSplitsukanBackupInput = {
  content: string;
  fileSizeBytes: number;
  currentApplicationSchemaVersion: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(new Date(value).getTime()) &&
    new Date(value).toISOString() === value
  );
}

export function parseSplitsukanBackup({
  content,
  fileSizeBytes,
  currentApplicationSchemaVersion,
}: ParseSplitsukanBackupInput): BackupValidationResult {
  if (fileSizeBytes > maximumBackupFileSizeBytes) {
    return { ok: false, reason: "file-too-large" };
  }

  if (!content.trim()) {
    return { ok: false, reason: "empty-file" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isRecord(parsed) || parsed.format !== splitsukanBackupFormat) {
    return { ok: false, reason: "invalid-format" };
  }

  if (parsed.backupVersion !== currentBackupVersion) {
    return { ok: false, reason: "unsupported-backup-version" };
  }

  if (parsed.applicationSchemaVersion !== currentApplicationSchemaVersion) {
    return { ok: false, reason: "unsupported-schema-version" };
  }

  if (!isValidIsoTimestamp(parsed.createdAt)) {
    return { ok: false, reason: "invalid-created-at" };
  }

  if (!Array.isArray(parsed.sessions)) {
    return { ok: false, reason: "invalid-data" };
  }

  const restoredState = restorePersistedApplicationState({
    schemaVersion: parsed.applicationSchemaVersion,
    sessions: parsed.sessions,
  });

  if (
    parsed.sessions.length > 0 &&
    restoredState.sessions.length !== parsed.sessions.length
  ) {
    return { ok: false, reason: "invalid-data" };
  }

  const backup: SplitsukanBackupFile = {
    format: splitsukanBackupFormat,
    backupVersion: currentBackupVersion,
    createdAt: parsed.createdAt,
    applicationSchemaVersion: currentApplicationSchemaVersion,
    sessions: structuredClone(restoredState.sessions),
  };

  return {
    ok: true,
    backup,
    summary: createBackupSummary(backup),
  };
}

export function getBackupValidationMessage(
  reason: BackupValidationFailureReason,
) {
  const messages: Record<BackupValidationFailureReason, string> = {
    "empty-file": "The selected backup file is empty.",
    "file-too-large": "The selected backup file exceeds the 5 MB safety limit.",
    "invalid-json": "The selected file does not contain valid JSON.",
    "invalid-format": "The selected file is not a SplitSukan backup.",
    "unsupported-backup-version":
      "This backup format version is not supported by the current app.",
    "unsupported-schema-version":
      "This backup was created with an unsupported SplitSukan data schema.",
    "invalid-created-at": "The backup creation timestamp is invalid.",
    "invalid-data": "The backup contains malformed session or financial data.",
  };

  return messages[reason];
}
