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
      {
        id: "naz",
        displayName: "Naz",
        normalizedName: "naz",
        defaultWeightUnits: 500,
        participantOrder: 2,
        isActive: true,
        createdAt: "2026-08-23T01:00:00.000Z",
        updatedAt: "2026-08-23T01:00:00.000Z",
      },
    ],
    expenses: [],
    repayments: [],
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

describe("calculateSessionBalances", () => {
  it("returns zero balances for a session without expenses", () => {
    const summary = calculateSessionBalances(createSession());

    expect(summary.totalActiveExpenseAmountMinor).toBe(0);
    expect(summary.totalPaidAmountMinor).toBe(0);
    expect(summary.totalOwedAmountMinor).toBe(0);
    expect(summary.balances).toEqual([
      { participantId: "juan", paidAmountMinor: 0, owedAmountMinor: 0, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: 0 },
      { participantId: "amir", paidAmountMinor: 0, owedAmountMinor: 0, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: 0 },
      { participantId: "naz", paidAmountMinor: 0, owedAmountMinor: 0, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: 0 },
    ]);
  });

  it("calculates paid, owed, and net amounts for one payer", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 10_000,
          paidByParticipantId: "juan",
          allocations: [
            { id: "a1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 4_000, allocationOrder: 0 },
            { id: "a2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 4_000, allocationOrder: 1 },
            { id: "a3", participantId: "naz", weightUnits: 500, shareAmountMinor: 2_000, allocationOrder: 2 },
          ],
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    expect(calculateSessionBalances(session).balances).toEqual([
      { participantId: "juan", paidAmountMinor: 10_000, owedAmountMinor: 4_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: 6_000 },
      { participantId: "amir", paidAmountMinor: 0, owedAmountMinor: 4_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: -4_000 },
      { participantId: "naz", paidAmountMinor: 0, owedAmountMinor: 2_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: -2_000 },
    ]);
  });

  it("combines multiple payers across active expenses", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 6_000,
          paidByParticipantId: "juan",
          allocations: [
            { id: "a1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 3_000, allocationOrder: 0 },
            { id: "a2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 3_000, allocationOrder: 1 },
          ],
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
        {
          id: "expense-2",
          description: "Shuttlecocks",
          amountMinor: 3_000,
          paidByParticipantId: "amir",
          allocations: [
            { id: "b1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 0 },
            { id: "b2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 1 },
            { id: "b3", participantId: "naz", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 2 },
          ],
          status: "active",
          createdAt: "2026-08-23T03:00:00.000Z",
          updatedAt: "2026-08-23T03:00:00.000Z",
        },
      ],
    });

    expect(calculateSessionBalances(session).balances).toEqual([
      { participantId: "juan", paidAmountMinor: 6_000, owedAmountMinor: 4_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: 2_000 },
      { participantId: "amir", paidAmountMinor: 3_000, owedAmountMinor: 4_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: -1_000 },
      { participantId: "naz", paidAmountMinor: 0, owedAmountMinor: 1_000, repaymentSentAmountMinor: 0, repaymentReceivedAmountMinor: 0, netAmountMinor: -1_000 },
    ]);
  });

  it("excludes void expenses from all totals and balances", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-void",
          description: "Cancelled expense",
          amountMinor: 9_000,
          paidByParticipantId: "juan",
          allocations: [
            { id: "v1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 4_500, allocationOrder: 0 },
            { id: "v2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 4_500, allocationOrder: 1 },
          ],
          status: "void",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    const summary = calculateSessionBalances(session);

    expect(summary.totalActiveExpenseAmountMinor).toBe(0);
    expect(summary.totalPaidAmountMinor).toBe(0);
    expect(summary.totalOwedAmountMinor).toBe(0);
    expect(summary.balances.every((balance) => balance.netAmountMinor === 0)).toBe(true);
  });

  it("preserves participant order regardless of allocation order", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 3_000,
          paidByParticipantId: "naz",
          allocations: [
            { id: "a1", participantId: "naz", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 0 },
            { id: "a2", participantId: "juan", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 1 },
            { id: "a3", participantId: "amir", weightUnits: 1000, shareAmountMinor: 1_000, allocationOrder: 2 },
          ],
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    expect(calculateSessionBalances(session).balances.map((item) => item.participantId)).toEqual([
      "juan",
      "amir",
      "naz",
    ]);
  });

  it("keeps total paid and owed equal to active expense total", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 10_001,
          paidByParticipantId: "juan",
          allocations: [
            { id: "a1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 4_001, allocationOrder: 0 },
            { id: "a2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 4_000, allocationOrder: 1 },
            { id: "a3", participantId: "naz", weightUnits: 500, shareAmountMinor: 2_000, allocationOrder: 2 },
          ],
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    const summary = calculateSessionBalances(session);
    expect(summary.totalActiveExpenseAmountMinor).toBe(10_001);
    expect(summary.totalPaidAmountMinor).toBe(10_001);
    expect(summary.totalOwedAmountMinor).toBe(10_001);
  });

  it("conserves money so all net balances sum to zero", () => {
    const session = createSession({
      expenses: [
        {
          id: "expense-1",
          description: "Court rental",
          amountMinor: 10_001,
          paidByParticipantId: "juan",
          allocations: [
            { id: "a1", participantId: "juan", weightUnits: 1000, shareAmountMinor: 4_001, allocationOrder: 0 },
            { id: "a2", participantId: "amir", weightUnits: 1000, shareAmountMinor: 4_000, allocationOrder: 1 },
            { id: "a3", participantId: "naz", weightUnits: 500, shareAmountMinor: 2_000, allocationOrder: 2 },
          ],
          status: "active",
          createdAt: "2026-08-23T02:00:00.000Z",
          updatedAt: "2026-08-23T02:00:00.000Z",
        },
      ],
    });

    expect(
      calculateSessionBalances(session).balances.reduce(
        (total, item) => total + item.netAmountMinor,
        0,
      ),
    ).toBe(0);
  });

  it("omits inactive participants from balance output", () => {
    const baseSession = createSession();
    const session = createSession({
      participants: baseSession.participants.map((participant) =>
        participant.id === "naz"
          ? { ...participant, isActive: false }
          : participant,
      ),
    });

    expect(calculateSessionBalances(session).balances.map((item) => item.participantId)).toEqual([
      "juan",
      "amir",
    ]);
  });
});
