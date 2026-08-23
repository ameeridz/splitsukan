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
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

describe("restorePersistedApplicationState", () => {
  it("restores valid version 3 data", () => {
    const session = createSession();

    expect(
      restorePersistedApplicationState({
        schemaVersion: 3,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 3, sessions: [session] });
  });

  it("migrates version 1 sessions with participants and expenses arrays", () => {
    const legacySession: Record<string, unknown> = { ...createSession() };
    delete legacySession.participants;
    delete legacySession.expenses;

    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [legacySession],
      }),
    ).toEqual({
      schemaVersion: 3,
      sessions: [{ ...legacySession, participants: [], expenses: [] }],
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

    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [legacySession],
      }),
    ).toEqual({
      schemaVersion: 3,
      sessions: [{ ...legacySession, expenses: [] }],
    });
  });

  it("restores valid expense and allocation data", () => {
    const session = createSession({
      expenses: [
        {
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
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    expect(
      restorePersistedApplicationState({
        schemaVersion: 3,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 3, sessions: [session] });
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

  it("rejects an invalid sessions value", () => {
    expect(
      restorePersistedApplicationState({ schemaVersion: 3, sessions: {} }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects an expense with a non-positive amount", () => {
    const invalidExpense = {
      id: "expense-1",
      description: "Court rental",
      amountMinor: 0,
      paidByParticipantId: "participant-1",
      allocations: [
        {
          id: "expense-1:allocation:0",
          participantId: "participant-1",
          weightUnits: 1000,
          shareAmountMinor: 0,
          allocationOrder: 0,
        },
      ],
      status: "active" as const,
      createdAt: "2026-08-23T02:00:00.000Z",
      updatedAt: "2026-08-23T02:00:00.000Z",
    };

    expect(
      restorePersistedApplicationState({
        schemaVersion: 3,
        sessions: [createSession({ expenses: [invalidExpense] })],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects an expense without allocations", () => {
    const invalidExpense = {
      id: "expense-1",
      description: "Court rental",
      amountMinor: 6800,
      paidByParticipantId: "participant-1",
      allocations: [],
      status: "active" as const,
      createdAt: "2026-08-23T02:00:00.000Z",
      updatedAt: "2026-08-23T02:00:00.000Z",
    };

    expect(
      restorePersistedApplicationState({
        schemaVersion: 3,
        sessions: [createSession({ expenses: [invalidExpense] })],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });
});
