import { describe, expect, it } from "vitest";

import type { SessionRecord } from "./session-model";
import {
  applySessionSettlementStatus,
  evaluateSessionSettlement,
} from "./session-settlement-model";

const timestamp = "2026-08-23T07:00:00.000Z";

function createSession(
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
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
      {
        id: "amir",
        displayName: "Amir",
        normalizedName: "amir",
        defaultWeightUnits: 1000,
        participantOrder: 1,
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

function activeExpense() {
  return {
    id: "expense-1",
    description: "Court rental",
    amountMinor: 10_000,
    paidByParticipantId: "juan",
    allocations: [
      {
        id: "allocation-1",
        participantId: "juan",
        weightUnits: 1000,
        shareAmountMinor: 5_000,
        allocationOrder: 0,
      },
      {
        id: "allocation-2",
        participantId: "amir",
        weightUnits: 1000,
        shareAmountMinor: 5_000,
        allocationOrder: 1,
      },
    ],
    status: "active" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function completedRepayment(amountMinor = 5_000) {
  return {
    id: "repayment-1",
    fromParticipantId: "amir",
    toParticipantId: "juan",
    amountMinor,
    note: null,
    status: "completed" as const,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("evaluateSessionSettlement", () => {
  it("keeps a session draft when there are no active expenses", () => {
    expect(
      evaluateSessionSettlement({ session: createSession(), timestamp }),
    ).toEqual({
      status: "draft",
      settledAt: null,
      isFullySettled: false,
      hasActiveExpenses: false,
      outstandingTransferCount: 0,
      outstandingAmountMinor: 0,
    });
  });

  it("marks a session active when an outstanding transfer exists", () => {
    const evaluation = evaluateSessionSettlement({
      session: createSession({ expenses: [activeExpense()] }),
      timestamp,
    });

    expect(evaluation.status).toBe("active");
    expect(evaluation.settledAt).toBeNull();
    expect(evaluation.isFullySettled).toBe(false);
    expect(evaluation.outstandingTransferCount).toBe(1);
    expect(evaluation.outstandingAmountMinor).toBe(5_000);
  });

  it("marks a session settled after the exact repayment", () => {
    expect(
      evaluateSessionSettlement({
        session: createSession({
          expenses: [activeExpense()],
          repayments: [completedRepayment()],
        }),
        timestamp,
      }),
    ).toEqual({
      status: "settled",
      settledAt: timestamp,
      isFullySettled: true,
      hasActiveExpenses: true,
      outstandingTransferCount: 0,
      outstandingAmountMinor: 0,
    });
  });

  it("preserves the original settled timestamp", () => {
    const originalSettledAt = "2026-08-23T06:00:00.000Z";
    const evaluation = evaluateSessionSettlement({
      session: createSession({
        status: "settled",
        settledAt: originalSettledAt,
        expenses: [activeExpense()],
        repayments: [completedRepayment()],
      }),
      timestamp,
    });

    expect(evaluation.settledAt).toBe(originalSettledAt);
  });

  it("reopens a settled session after a completed repayment is voided", () => {
    const evaluation = evaluateSessionSettlement({
      session: createSession({
        status: "settled",
        settledAt: "2026-08-23T06:00:00.000Z",
        expenses: [activeExpense()],
        repayments: [
          {
            ...completedRepayment(),
            status: "void",
          },
        ],
      }),
      timestamp,
    });

    expect(evaluation.status).toBe("active");
    expect(evaluation.settledAt).toBeNull();
    expect(evaluation.outstandingAmountMinor).toBe(5_000);
  });

  it("keeps a partially repaid session active", () => {
    const evaluation = evaluateSessionSettlement({
      session: createSession({
        expenses: [activeExpense()],
        repayments: [completedRepayment(2_000)],
      }),
      timestamp,
    });

    expect(evaluation.status).toBe("active");
    expect(evaluation.outstandingAmountMinor).toBe(3_000);
  });

  it("returns a new session record with synchronized status fields", () => {
    const session = createSession({
      expenses: [activeExpense()],
      repayments: [completedRepayment()],
    });
    const updatedSession = applySessionSettlementStatus(session, timestamp);

    expect(updatedSession).not.toBe(session);
    expect(updatedSession.status).toBe("settled");
    expect(updatedSession.settledAt).toBe(timestamp);
    expect(updatedSession.expenses).toBe(session.expenses);
    expect(updatedSession.repayments).toBe(session.repayments);
  });
});
