import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import {
  getParticipantRemovalMode,
  hasParticipantFinancialReferences,
} from "./participant-removal";

const timestamp = "2026-08-23T10:00:00.000Z";

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    activityType: "badminton",
    customActivityName: null,
    date: "2026-08-25",
    startTime: "20:30",
    venue: "The Roof",
    note: null,
    currency: "MYR",
    status: "draft",
    participants: [
      {
        id: "juan",
        displayName: "Juan",
        normalizedName: "juan",
        defaultWeightUnits: 1000,
        participantOrder: 0,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    expenses: [],
    repayments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    settledAt: null,
    ...overrides,
  };
}

describe("participant removal safety", () => {
  it("allows hard deletion without financial references", () => {
    const session = createSession();

    expect(hasParticipantFinancialReferences(session, "juan")).toBe(false);
    expect(getParticipantRemovalMode(session, "juan")).toBe("delete");
  });

  it("archives an expense payer", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 1000,
          paidByParticipantId: "juan",
          allocations: [
            {
              id: "allocation-1",
              participantId: "juan",
              weightUnits: 1000,
              shareAmountMinor: 1000,
              allocationOrder: 0,
            },
          ],
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });

    expect(getParticipantRemovalMode(session, "juan")).toBe("archive");
  });

  it("archives an allocated participant", () => {
    const expense = {
      id: "expense-1",
      description: "Court rental",
      amountMinor: 1000,
      paidByParticipantId: "payer",
      allocations: [
        {
          id: "allocation-1",
          participantId: "juan",
          weightUnits: 1000,
          shareAmountMinor: 1000,
          allocationOrder: 0,
        },
      ],
      status: "active" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    expect(
      getParticipantRemovalMode(createSession({ expenses: [expense] }), "juan"),
    ).toBe("archive");
  });

  it("archives a participant referenced by repayment history", () => {
    const session = createSession({
      repayments: [
        {
          id: "repayment-1",
          fromParticipantId: "juan",
          toParticipantId: "recipient",
          amountMinor: 500,
          note: null,
          status: "void",
          completedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });

    expect(getParticipantRemovalMode(session, "juan")).toBe("archive");
  });
});
