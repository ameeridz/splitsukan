import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import { createSessionReportSnapshot } from "./report-snapshot-model";

const generatedAt = "2026-08-23T10:00:00.000Z";
const timestamp = "2026-08-23T08:00:00.000Z";

function createSession(
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    id: "session-1",
    activityType: "badminton",
    customActivityName: null,
    date: "2026-08-25",
    startTime: "20:30",
    venue: "The Roof",
    note: "Court 2",
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
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "amir",
        displayName: "Amir",
        normalizedName: "amir",
        defaultWeightUnits: 500,
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
    amountMinor: 7_500,
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
        weightUnits: 500,
        shareAmountMinor: 2_500,
        allocationOrder: 1,
      },
    ],
    status: "active" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function completedRepayment() {
  return {
    id: "repayment-1",
    fromParticipantId: "amir",
    toParticipantId: "juan",
    amountMinor: 2_500,
    note: "Paid via DuitNow",
    status: "completed" as const,
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("createSessionReportSnapshot", () => {
  it("creates a draft snapshot without financial activity", () => {
    const snapshot = createSessionReportSnapshot({
      session: createSession({ status: "draft" }),
      generatedAt,
    });

    expect(snapshot.reportState).toBe("draft");
    expect(snapshot.generatedAt).toBe(generatedAt);
    expect(snapshot.totals.activeExpenseAmountMinor).toBe(0);
    expect(snapshot.totals.outstandingTransferCount).toBe(0);
  });

  it("creates an outstanding snapshot with calculated totals", () => {
    const snapshot = createSessionReportSnapshot({
      session: createSession({ expenses: [activeExpense()] }),
      generatedAt,
    });

    expect(snapshot.reportState).toBe("outstanding");
    expect(snapshot.session.activityName).toBe("Badminton");
    expect(snapshot.totals).toEqual({
      participantCount: 2,
      activeExpenseCount: 1,
      activeExpenseAmountMinor: 7_500,
      completedRepaymentCount: 0,
      completedRepaymentAmountMinor: 0,
      outstandingTransferCount: 1,
      outstandingAmountMinor: 2_500,
    });
    expect(snapshot.transfers[0]).toEqual({
      fromParticipantId: "amir",
      fromParticipantName: "Amir",
      toParticipantId: "juan",
      toParticipantName: "Juan",
      amountMinor: 2_500,
      transferOrder: 0,
    });
  });

  it("creates a settled snapshot after exact repayment", () => {
    const snapshot = createSessionReportSnapshot({
      session: createSession({
        status: "settled",
        settledAt: timestamp,
        expenses: [activeExpense()],
        repayments: [completedRepayment()],
      }),
      generatedAt,
    });

    expect(snapshot.reportState).toBe("settled");
    expect(snapshot.totals.completedRepaymentCount).toBe(1);
    expect(snapshot.totals.completedRepaymentAmountMinor).toBe(2_500);
    expect(snapshot.totals.outstandingTransferCount).toBe(0);
    expect(snapshot.balances.map((balance) => balance.netAmountMinor)).toEqual([
      0,
      0,
    ]);
  });

  it("preserves active and void financial records in history", () => {
    const voidExpense = {
      ...activeExpense(),
      id: "expense-void",
      status: "void" as const,
    };
    const voidRepayment = {
      ...completedRepayment(),
      id: "repayment-void",
      status: "void" as const,
    };
    const snapshot = createSessionReportSnapshot({
      session: createSession({
        expenses: [activeExpense(), voidExpense],
        repayments: [voidRepayment],
      }),
      generatedAt,
    });

    expect(snapshot.expenses.map((expense) => expense.status)).toEqual([
      "active",
      "void",
    ]);
    expect(snapshot.repayments[0]?.status).toBe("void");
    expect(snapshot.totals.activeExpenseCount).toBe(1);
    expect(snapshot.totals.completedRepaymentCount).toBe(0);
  });

  it("sorts participants and allocations by their stable order", () => {
    const baseSession = createSession({ expenses: [activeExpense()] });
    const snapshot = createSessionReportSnapshot({
      session: {
        ...baseSession,
        participants: [...baseSession.participants].reverse(),
        expenses: [
          {
            ...baseSession.expenses[0]!,
            allocations: [...baseSession.expenses[0]!.allocations].reverse(),
          },
        ],
      },
      generatedAt,
    });

    expect(snapshot.participants.map((participant) => participant.id)).toEqual([
      "juan",
      "amir",
    ]);
    expect(
      snapshot.expenses[0]?.allocations.map(
        (allocation) => allocation.participantId,
      ),
    ).toEqual(["juan", "amir"]);
  });

  it("uses safe participant names for missing historical references", () => {
    const expense = activeExpense();
    const snapshot = createSessionReportSnapshot({
      session: createSession({
        participants: [],
        expenses: [expense],
      }),
      generatedAt,
    });

    expect(snapshot.expenses[0]?.payerName).toBe("Unknown participant");
    expect(snapshot.expenses[0]?.allocations[0]?.participantName).toBe(
      "Unknown participant",
    );
  });

  it("does not share nested array references with the source session", () => {
    const session = createSession({ expenses: [activeExpense()] });
    const snapshot = createSessionReportSnapshot({ session, generatedAt });

    expect(snapshot.participants).not.toBe(session.participants);
    expect(snapshot.expenses).not.toBe(session.expenses);
    expect(snapshot.expenses[0]?.allocations).not.toBe(
      session.expenses[0]?.allocations,
    );
    expect(snapshot.repayments).not.toBe(session.repayments);
  });
});
