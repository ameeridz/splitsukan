import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import {
  createBackupFileName,
  createBackupSummary,
  createSplitsukanBackup,
  currentBackupVersion,
  serializeSplitsukanBackup,
  splitsukanBackupFormat,
} from "./backup-model";

const createdAt = "2026-08-23T10:51:30.000Z";

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
    status: "active",
    participants: [
      {
        id: "juan",
        displayName: "Juan",
        normalizedName: "juan",
        defaultWeightUnits: 1000,
        participantOrder: 0,
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "amir",
        displayName: "Amir",
        normalizedName: "amir",
        defaultWeightUnits: 500,
        participantOrder: 1,
        isActive: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    expenses: [
      {
        id: "expense-1",
        description: "Court rental",
        amountMinor: 10_000,
        paidByParticipantId: "juan",
        allocations: [
          {
            id: "allocation-1",
            participantId: "juan",
            weightUnits: 1000,
            shareAmountMinor: 10_000,
            allocationOrder: 0,
          },
        ],
        status: "active",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    repayments: [
      {
        id: "repayment-1",
        fromParticipantId: "amir",
        toParticipantId: "juan",
        amountMinor: 5_000,
        note: "Paid via DuitNow",
        status: "completed",
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
    settledAt: null,
  };
}

describe("backup model", () => {
  it("creates a versioned SplitSukan backup", () => {
    const session = createSession();
    const backup = createSplitsukanBackup({
      applicationSchemaVersion: 4,
      sessions: [session],
      createdAt,
    });

    expect(backup.format).toBe(splitsukanBackupFormat);
    expect(backup.backupVersion).toBe(currentBackupVersion);
    expect(backup.applicationSchemaVersion).toBe(4);
    expect(backup.createdAt).toBe(createdAt);
    expect(backup.sessions).toEqual([session]);
  });

  it("does not share nested session references with application state", () => {
    const session = createSession();
    const backup = createSplitsukanBackup({
      applicationSchemaVersion: 4,
      sessions: [session],
      createdAt,
    });

    expect(backup.sessions).not.toBe([session]);
    expect(backup.sessions[0]).not.toBe(session);
    expect(backup.sessions[0]?.participants).not.toBe(session.participants);
    expect(backup.sessions[0]?.expenses).not.toBe(session.expenses);
    expect(backup.sessions[0]?.repayments).not.toBe(session.repayments);
  });

  it("creates an aggregate backup summary", () => {
    const backup = createSplitsukanBackup({
      applicationSchemaVersion: 4,
      sessions: [createSession(), { ...createSession(), id: "session-2" }],
      createdAt,
    });

    expect(createBackupSummary(backup)).toEqual({
      sessionCount: 2,
      participantCount: 4,
      expenseCount: 2,
      repaymentCount: 2,
      createdAt,
      applicationSchemaVersion: 4,
    });
  });

  it("creates a deterministic UTC backup filename", () => {
    expect(createBackupFileName(createdAt)).toBe(
      "splitsukan-backup-2026-08-23-105130.json",
    );
  });

  it("uses a safe fallback filename for an invalid timestamp", () => {
    expect(createBackupFileName("invalid-date")).toBe(
      "splitsukan-backup.json",
    );
  });

  it("serializes formatted JSON with a trailing newline", () => {
    const backup = createSplitsukanBackup({
      applicationSchemaVersion: 4,
      sessions: [],
      createdAt,
    });
    const serialized = serializeSplitsukanBackup(backup);

    expect(serialized.endsWith("\n")).toBe(true);
    expect(JSON.parse(serialized)).toEqual(backup);
    expect(serialized).toContain('\n  "format": "splitsukan-backup"');
  });
});
