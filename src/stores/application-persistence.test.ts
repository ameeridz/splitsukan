import { describe, expect, it } from "vitest";

import {
  emptyPersistedApplicationState,
  restorePersistedApplicationState,
} from "./application-persistence";
import type { SessionRecord } from "../features/sessions/session-model";

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    activityType: "badminton",
    customActivityName: null,
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: null,
    currency: "MYR",
    status: "draft",
    participants: [],
    expenses: [],
    repayments: [],
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

describe("restorePersistedApplicationState", () => {
  it("restores valid version 4 data", () => {
    const session = createSession();

    expect(
      restorePersistedApplicationState({
        schemaVersion: 4,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 4, sessions: [session] });
  });

  it("migrates version 1 sessions with empty domain arrays", () => {
    const legacySession: Record<string, unknown> = { ...createSession() };
    delete legacySession.participants;
    delete legacySession.expenses;
    delete legacySession.repayments;

    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [legacySession],
      }),
    ).toEqual({
      schemaVersion: 4,
      sessions: [
        {
          ...legacySession,
          participants: [],
          expenses: [],
          repayments: [],
        },
      ],
    });
  });

  it("migrates version 2 sessions while preserving participants", () => {
    const participant = {
      id: "participant-1",
      displayName: "Juan",
      normalizedName: "juan",
      defaultWeightUnits: 1000,
      participantOrder: 0,
      isActive: true,
      createdAt: "2026-08-23T01:00:00.000Z",
      updatedAt: "2026-08-23T01:00:00.000Z",
    };
    const legacySession: Record<string, unknown> = {
      ...createSession({ participants: [participant] }),
    };
    delete legacySession.expenses;
    delete legacySession.repayments;

    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [legacySession],
      }),
    ).toEqual({
      schemaVersion: 4,
      sessions: [{ ...legacySession, expenses: [], repayments: [] }],
    });
  });

  it("migrates version 3 sessions while preserving expenses", () => {
    const expense = {
      id: "expense-1",
      description: "Court rental",
      amountMinor: 6800,
      paidByParticipantId: "participant-1",
      allocations: [
        {
          id: "expense-1:allocation:0",
          participantId: "participant-1",
          weightUnits: 1000,
          shareAmountMinor: 6800,
          allocationOrder: 0,
        },
      ],
      status: "active" as const,
      createdAt: "2026-08-23T02:00:00.000Z",
      updatedAt: "2026-08-23T02:00:00.000Z",
    };
    const legacySession: Record<string, unknown> = {
      ...createSession({ expenses: [expense] }),
    };
    delete legacySession.repayments;

    expect(
      restorePersistedApplicationState({
        schemaVersion: 3,
        sessions: [legacySession],
      }),
    ).toEqual({
      schemaVersion: 4,
      sessions: [{ ...legacySession, repayments: [] }],
    });
  });

  it("restores valid repayment data", () => {
    const session = createSession({
      repayments: [
        {
          id: "repayment-1",
          fromParticipantId: "participant-2",
          toParticipantId: "participant-1",
          amountMinor: 1429,
          note: "Paid via DuitNow",
          status: "completed",
          completedAt: "2026-08-23T05:00:00.000Z",
          createdAt: "2026-08-23T05:00:00.000Z",
          updatedAt: "2026-08-23T05:00:00.000Z",
        },
      ],
    });

    expect(
      restorePersistedApplicationState({
        schemaVersion: 4,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 4, sessions: [session] });
  });

  it("rejects a repayment where payer and recipient are identical", () => {
    const session = createSession({
      repayments: [
        {
          id: "repayment-1",
          fromParticipantId: "participant-1",
          toParticipantId: "participant-1",
          amountMinor: 100,
          note: null,
          status: "completed",
          completedAt: "2026-08-23T05:00:00.000Z",
          createdAt: "2026-08-23T05:00:00.000Z",
          updatedAt: "2026-08-23T05:00:00.000Z",
        },
      ],
    });

    expect(
      restorePersistedApplicationState({
        schemaVersion: 4,
        sessions: [session],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a repayment with a non-positive amount", () => {
    const session = createSession({
      repayments: [
        {
          id: "repayment-1",
          fromParticipantId: "participant-2",
          toParticipantId: "participant-1",
          amountMinor: 0,
          note: null,
          status: "completed",
          completedAt: "2026-08-23T05:00:00.000Z",
          createdAt: "2026-08-23T05:00:00.000Z",
          updatedAt: "2026-08-23T05:00:00.000Z",
        },
      ],
    });

    expect(
      restorePersistedApplicationState({
        schemaVersion: 4,
        sessions: [session],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a repayment with an invalid status", () => {
    const session = createSession();
    const invalidSession = {
      ...session,
      repayments: [
        {
          id: "repayment-1",
          fromParticipantId: "participant-2",
          toParticipantId: "participant-1",
          amountMinor: 100,
          note: null,
          status: "unknown",
          completedAt: "2026-08-23T05:00:00.000Z",
          createdAt: "2026-08-23T05:00:00.000Z",
          updatedAt: "2026-08-23T05:00:00.000Z",
        },
      ],
    };

    expect(
      restorePersistedApplicationState({
        schemaVersion: 4,
        sessions: [invalidSession],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("returns empty state for malformed or unsupported root data", () => {
    expect(restorePersistedApplicationState(null)).toEqual(
      emptyPersistedApplicationState,
    );
    expect(restorePersistedApplicationState("invalid-data")).toEqual(
      emptyPersistedApplicationState,
    );
    expect(
      restorePersistedApplicationState({ schemaVersion: 99, sessions: [] }),
    ).toEqual(emptyPersistedApplicationState);
  });
});
