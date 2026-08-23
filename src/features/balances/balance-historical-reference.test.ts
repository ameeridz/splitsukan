import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../sessions/session-model";
import { calculateSessionBalances } from "./balance-model";
import { calculateSettlementTransfers } from "./settlement-model";

const timestamp = "2026-08-23T10:00:00.000Z";

function createSession(): SessionRecord {
  return {
    id: "session-1",
    activityType: "badminton",
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
        createdAt: timestamp,
        updatedAt: timestamp,
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
            participantId: "removed-participant",
            weightUnits: 1000,
            shareAmountMinor: 5_000,
            allocationOrder: 1,
          },
        ],
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    repayments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    settledAt: null,
  };
}

describe("historical participant references", () => {
  it("keeps a removed participant in balance calculations", () => {
    const summary = calculateSessionBalances(createSession());

    expect(summary.totalPaidAmountMinor).toBe(10_000);
    expect(summary.totalOwedAmountMinor).toBe(10_000);
    expect(summary.balances).toEqual([
      {
        participantId: "juan",
        paidAmountMinor: 10_000,
        owedAmountMinor: 5_000,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: 5_000,
      },
      {
        participantId: "removed-participant",
        paidAmountMinor: 0,
        owedAmountMinor: 5_000,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: -5_000,
      },
    ]);
  });

  it("preserves the zero-sum invariant and settlement suggestion", () => {
    const summary = calculateSessionBalances(createSession());

    expect(
      summary.balances.reduce(
        (total, balance) => total + balance.netAmountMinor,
        0,
      ),
    ).toBe(0);
    expect(calculateSettlementTransfers(summary.balances)).toEqual([
      {
        fromParticipantId: "removed-participant",
        toParticipantId: "juan",
        amountMinor: 5_000,
        transferOrder: 0,
      },
    ]);
  });
});
