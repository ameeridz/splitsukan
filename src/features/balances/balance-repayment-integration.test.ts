import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import { calculateSessionBalances } from "./balance-model";

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
        createdAt: "2026-08-23T01:00:00.000Z",
        updatedAt: "2026-08-23T01:00:00.000Z",
      },
      {
        id: "amir",
        displayName: "Amir",
        normalizedName: "amir",
        defaultWeightUnits: 1000,
        participantOrder: 1,
        isActive: true,
        createdAt: "2026-08-23T01:00:00.000Z",
        updatedAt: "2026-08-23T01:00:00.000Z",
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
        status: "active",
        createdAt: "2026-08-23T02:00:00.000Z",
        updatedAt: "2026-08-23T02:00:00.000Z",
      },
    ],
    repayments: [],
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

function repayment(
  amountMinor: number,
  status: "completed" | "void" = "completed",
) {
  return {
    id: `repayment-${amountMinor}-${status}`,
    fromParticipantId: "amir",
    toParticipantId: "juan",
    amountMinor,
    note: null,
    status,
    completedAt: "2026-08-23T05:00:00.000Z",
    createdAt: "2026-08-23T05:00:00.000Z",
    updatedAt: "2026-08-23T05:00:00.000Z",
  } as const;
}

describe("calculateSessionBalances repayment integration", () => {
  it("reduces outstanding balances after a completed repayment", () => {
    const summary = calculateSessionBalances(
      createSession({ repayments: [repayment(2_000)] }),
    );

    expect(summary.totalCompletedRepaymentAmountMinor).toBe(2_000);
    expect(summary.balances).toEqual([
      {
        participantId: "juan",
        paidAmountMinor: 10_000,
        owedAmountMinor: 5_000,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 2_000,
        netAmountMinor: 3_000,
      },
      {
        participantId: "amir",
        paidAmountMinor: 0,
        owedAmountMinor: 5_000,
        repaymentSentAmountMinor: 2_000,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: -3_000,
      },
    ]);
  });

  it("fully settles both participants after the exact repayment", () => {
    const summary = calculateSessionBalances(
      createSession({ repayments: [repayment(5_000)] }),
    );

    expect(summary.balances.map((balance) => balance.netAmountMinor)).toEqual([
      0,
      0,
    ]);
  });

  it("accumulates multiple completed repayments", () => {
    const summary = calculateSessionBalances(
      createSession({
        repayments: [repayment(2_000), repayment(1_500)],
      }),
    );

    expect(summary.totalCompletedRepaymentAmountMinor).toBe(3_500);
    expect(summary.balances.map((balance) => balance.netAmountMinor)).toEqual([
      1_500,
      -1_500,
    ]);
  });

  it("ignores void repayments", () => {
    const summary = calculateSessionBalances(
      createSession({ repayments: [repayment(5_000, "void")] }),
    );

    expect(summary.totalCompletedRepaymentAmountMinor).toBe(0);
    expect(summary.balances.map((balance) => balance.netAmountMinor)).toEqual([
      5_000,
      -5_000,
    ]);
  });

  it("keeps expense paid and owed totals unchanged by repayments", () => {
    const summary = calculateSessionBalances(
      createSession({ repayments: [repayment(2_000)] }),
    );

    expect(summary.totalActiveExpenseAmountMinor).toBe(10_000);
    expect(summary.totalPaidAmountMinor).toBe(10_000);
    expect(summary.totalOwedAmountMinor).toBe(10_000);
  });

  it("conserves money after completed repayments", () => {
    const summary = calculateSessionBalances(
      createSession({ repayments: [repayment(2_000)] }),
    );

    expect(
      summary.balances.reduce(
        (total, balance) => total + balance.netAmountMinor,
        0,
      ),
    ).toBe(0);
  });
});
