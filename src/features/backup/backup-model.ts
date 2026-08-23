import type { SessionRecord } from "../sessions/session-model";

export const splitsukanBackupFormat = "splitsukan-backup" as const;
export const currentBackupVersion = 1;

export type SplitsukanBackupFile = {
  format: typeof splitsukanBackupFormat;
  backupVersion: number;
  createdAt: string;
  applicationSchemaVersion: number;
  sessions: SessionRecord[];
};

export type CreateSplitsukanBackupInput = {
  applicationSchemaVersion: number;
  sessions: SessionRecord[];
  createdAt: string;
};

export type BackupSummary = {
  sessionCount: number;
  participantCount: number;
  expenseCount: number;
  repaymentCount: number;
  createdAt: string;
  applicationSchemaVersion: number;
};

export function createSplitsukanBackup({
  applicationSchemaVersion,
  sessions,
  createdAt,
}: CreateSplitsukanBackupInput): SplitsukanBackupFile {
  return {
    format: splitsukanBackupFormat,
    backupVersion: currentBackupVersion,
    createdAt,
    applicationSchemaVersion,
    sessions: structuredClone(sessions),
  };
}

export function createBackupSummary(
  backup: SplitsukanBackupFile,
): BackupSummary {
  return {
    sessionCount: backup.sessions.length,
    participantCount: backup.sessions.reduce(
      (total, session) => total + session.participants.length,
      0,
    ),
    expenseCount: backup.sessions.reduce(
      (total, session) => total + session.expenses.length,
      0,
    ),
    repaymentCount: backup.sessions.reduce(
      (total, session) => total + session.repayments.length,
      0,
    ),
    createdAt: backup.createdAt,
    applicationSchemaVersion: backup.applicationSchemaVersion,
  };
}

export function createBackupFileName(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "splitsukan-backup.json";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");

  return `splitsukan-backup-${year}-${month}-${day}-${hour}${minute}${second}.json`;
}

export function serializeSplitsukanBackup(backup: SplitsukanBackupFile) {
  return `${JSON.stringify(backup, null, 2)}\n`;
}
