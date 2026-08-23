import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import {
  createSplitsukanBackup,
  serializeSplitsukanBackup,
} from "./backup-model";
import {
  getBackupValidationMessage,
  maximumBackupFileSizeBytes,
  parseSplitsukanBackup,
} from "./backup-validation";

const createdAt = "2026-08-23T10:51:30.000Z";
const schemaVersion = 4;

function createSession(): SessionRecord {
  return {
    id: "session-1",
    activityType: "futsal",
    customActivityName: null,
    date: "2026-08-25",
    startTime: "20:30",
    venue: "The Roof",
    note: null,
    currency: "MYR",
    status: "draft",
    participants: [],
    expenses: [],
    repayments: [],
    createdAt,
    updatedAt: createdAt,
    settledAt: null,
  };
}

function parse(content: string, fileSizeBytes = content.length) {
  return parseSplitsukanBackup({
    content,
    fileSizeBytes,
    currentApplicationSchemaVersion: schemaVersion,
  });
}

function validContent(sessions: SessionRecord[] = [createSession()]) {
  return serializeSplitsukanBackup(
    createSplitsukanBackup({
      applicationSchemaVersion: schemaVersion,
      sessions,
      createdAt,
    }),
  );
}

describe("parseSplitsukanBackup", () => {
  it("validates and restores a current SplitSukan backup", () => {
    const result = parse(validContent());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.sessions).toEqual([createSession()]);
      expect(result.summary).toEqual({
        sessionCount: 1,
        participantCount: 0,
        expenseCount: 0,
        repaymentCount: 0,
        createdAt,
        applicationSchemaVersion: schemaVersion,
      });
    }
  });

  it("accepts a valid backup with zero sessions", () => {
    const result = parse(validContent([]));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.summary.sessionCount).toBe(0);
  });

  it("rejects empty and invalid JSON files", () => {
    expect(parse("   ")).toEqual({ ok: false, reason: "empty-file" });
    expect(parse("{invalid-json")).toEqual({
      ok: false,
      reason: "invalid-json",
    });
  });

  it("rejects unrelated JSON files", () => {
    expect(parse(JSON.stringify({ sessions: [] }))).toEqual({
      ok: false,
      reason: "invalid-format",
    });
  });

  it("rejects unsupported backup and schema versions", () => {
    const backup = JSON.parse(validContent()) as Record<string, unknown>;

    expect(
      parse(JSON.stringify({ ...backup, backupVersion: 99 })),
    ).toEqual({ ok: false, reason: "unsupported-backup-version" });
    expect(
      parse(JSON.stringify({ ...backup, applicationSchemaVersion: 99 })),
    ).toEqual({ ok: false, reason: "unsupported-schema-version" });
  });

  it("rejects invalid timestamps and sessions containers", () => {
    const backup = JSON.parse(validContent()) as Record<string, unknown>;

    expect(parse(JSON.stringify({ ...backup, createdAt: "invalid" }))).toEqual({
      ok: false,
      reason: "invalid-created-at",
    });
    expect(parse(JSON.stringify({ ...backup, sessions: {} }))).toEqual({
      ok: false,
      reason: "invalid-data",
    });
  });

  it("rejects malformed session and financial data", () => {
    const backup = JSON.parse(validContent()) as {
      sessions: Array<Record<string, unknown>>;
    };
    const invalidSession = {
      ...backup.sessions[0],
      currency: "USD",
    };

    expect(
      parse(
        JSON.stringify({
          ...backup,
          format: "splitsukan-backup",
          backupVersion: 1,
          createdAt,
          applicationSchemaVersion: schemaVersion,
          sessions: [invalidSession],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid-data" });
  });

  it("rejects files above the safety size limit", () => {
    expect(parse(validContent(), maximumBackupFileSizeBytes + 1)).toEqual({
      ok: false,
      reason: "file-too-large",
    });
  });

  it("provides a user-facing message for every validation failure", () => {
    expect(getBackupValidationMessage("invalid-json")).toBe(
      "The selected file does not contain valid JSON.",
    );
    expect(getBackupValidationMessage("file-too-large")).toContain("5 MB");
  });
});
