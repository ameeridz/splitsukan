import { describe, expect, it } from "vitest";

import type { ParticipantBalance } from "./balance-model";
import { calculateSettlementTransfers } from "./settlement-model";

function balance(
  participantId: string,
  netAmountMinor: number,
): ParticipantBalance {
  return {
    participantId,
    paidAmountMinor: Math.max(netAmountMinor, 0),
    owedAmountMinor: Math.max(-netAmountMinor, 0),
    repaymentSentAmountMinor: 0,
    repaymentReceivedAmountMinor: 0,
    netAmountMinor,
  };
}

describe("calculateSettlementTransfers", () => {
  it("returns no transfers when all participants are balanced", () => {
    expect(
      calculateSettlementTransfers([
        balance("juan", 0),
        balance("amir", 0),
      ]),
    ).toEqual([]);
  });

  it("creates one transfer for one debtor and one creditor", () => {
    expect(
      calculateSettlementTransfers([
        balance("juan", 4_000),
        balance("amir", -4_000),
      ]),
    ).toEqual([
      {
        fromParticipantId: "amir",
        toParticipantId: "juan",
        amountMinor: 4_000,
        transferOrder: 0,
      },
    ]);
  });

  it("settles multiple debtors against one creditor", () => {
    expect(
      calculateSettlementTransfers([
        balance("juan", 6_000),
        balance("amir", -4_000),
        balance("naz", -2_000),
      ]),
    ).toEqual([
      {
        fromParticipantId: "amir",
        toParticipantId: "juan",
        amountMinor: 4_000,
        transferOrder: 0,
      },
      {
        fromParticipantId: "naz",
        toParticipantId: "juan",
        amountMinor: 2_000,
        transferOrder: 1,
      },
    ]);
  });

  it("settles one debtor against multiple creditors", () => {
    expect(
      calculateSettlementTransfers([
        balance("juan", 3_000),
        balance("amir", 2_000),
        balance("naz", -5_000),
      ]),
    ).toEqual([
      {
        fromParticipantId: "naz",
        toParticipantId: "juan",
        amountMinor: 3_000,
        transferOrder: 0,
      },
      {
        fromParticipantId: "naz",
        toParticipantId: "amir",
        amountMinor: 2_000,
        transferOrder: 1,
      },
    ]);
  });

  it("prioritizes larger balances before participant order", () => {
    expect(
      calculateSettlementTransfers([
        balance("small-creditor", 2_000),
        balance("large-creditor", 5_000),
        balance("small-debtor", -1_000),
        balance("large-debtor", -6_000),
      ]),
    ).toEqual([
      {
        fromParticipantId: "large-debtor",
        toParticipantId: "large-creditor",
        amountMinor: 5_000,
        transferOrder: 0,
      },
      {
        fromParticipantId: "large-debtor",
        toParticipantId: "small-creditor",
        amountMinor: 1_000,
        transferOrder: 1,
      },
      {
        fromParticipantId: "small-debtor",
        toParticipantId: "small-creditor",
        amountMinor: 1_000,
        transferOrder: 2,
      },
    ]);
  });

  it("uses participant order as a deterministic tie-break", () => {
    expect(
      calculateSettlementTransfers([
        balance("first-creditor", 2_000),
        balance("second-creditor", 2_000),
        balance("first-debtor", -2_000),
        balance("second-debtor", -2_000),
      ]),
    ).toEqual([
      {
        fromParticipantId: "first-debtor",
        toParticipantId: "first-creditor",
        amountMinor: 2_000,
        transferOrder: 0,
      },
      {
        fromParticipantId: "second-debtor",
        toParticipantId: "second-creditor",
        amountMinor: 2_000,
        transferOrder: 1,
      },
    ]);
  });

  it("does not create zero-value transfers", () => {
    const transfers = calculateSettlementTransfers([
      balance("juan", 1),
      balance("amir", 0),
      balance("naz", -1),
    ]);

    expect(transfers).toHaveLength(1);
    expect(transfers.every((transfer) => transfer.amountMinor > 0)).toBe(true);
  });

  it("fully resolves every participant balance", () => {
    const balances = [
      balance("juan", 8_571),
      balance("adzlam", -1_429),
      balance("safwan", -1_429),
      balance("razif", -1_429),
      balance("nazirul", -1_428),
      balance("shafeeq", -1_428),
      balance("farid", -1_428),
    ];
    const transfers = calculateSettlementTransfers(balances);
    const resolvedByParticipant = new Map(
      balances.map((item) => [item.participantId, item.netAmountMinor]),
    );

    for (const transfer of transfers) {
      resolvedByParticipant.set(
        transfer.fromParticipantId,
        (resolvedByParticipant.get(transfer.fromParticipantId) ?? 0) +
          transfer.amountMinor,
      );
      resolvedByParticipant.set(
        transfer.toParticipantId,
        (resolvedByParticipant.get(transfer.toParticipantId) ?? 0) -
          transfer.amountMinor,
      );
    }

    expect([...resolvedByParticipant.values()]).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("rejects balances that do not sum to zero", () => {
    expect(() =>
      calculateSettlementTransfers([
        balance("juan", 4_000),
        balance("amir", -3_000),
      ]),
    ).toThrow("Participant net balances must sum to zero.");
  });
});
