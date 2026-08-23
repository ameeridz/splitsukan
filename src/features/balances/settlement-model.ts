import type { ParticipantId } from "../participants/participant-model";
import type { ParticipantBalance } from "./balance-model";

export type SettlementTransfer = {
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amountMinor: number;
  transferOrder: number;
};

type WorkingBalance = {
  participantId: ParticipantId;
  amountMinor: number;
  participantOrder: number;
};

export function calculateSettlementTransfers(
  balances: ParticipantBalance[],
): SettlementTransfer[] {
  const netTotal = balances.reduce(
    (total, balance) => total + balance.netAmountMinor,
    0,
  );

  if (netTotal !== 0) {
    throw new Error("Participant net balances must sum to zero.");
  }

  const creditors: WorkingBalance[] = balances
    .map((balance, participantOrder) => ({
      participantId: balance.participantId,
      amountMinor: balance.netAmountMinor,
      participantOrder,
    }))
    .filter((balance) => balance.amountMinor > 0)
    .sort((first, second) => {
      if (second.amountMinor !== first.amountMinor) {
        return second.amountMinor - first.amountMinor;
      }

      return first.participantOrder - second.participantOrder;
    });
  const debtors: WorkingBalance[] = balances
    .map((balance, participantOrder) => ({
      participantId: balance.participantId,
      amountMinor: -balance.netAmountMinor,
      participantOrder,
    }))
    .filter((balance) => balance.amountMinor > 0)
    .sort((first, second) => {
      if (second.amountMinor !== first.amountMinor) {
        return second.amountMinor - first.amountMinor;
      }

      return first.participantOrder - second.participantOrder;
    });

  const transfers: SettlementTransfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (!creditor || !debtor) {
      break;
    }

    const amountMinor = Math.min(
      creditor.amountMinor,
      debtor.amountMinor,
    );

    if (amountMinor > 0) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        amountMinor,
        transferOrder: transfers.length,
      });
    }

    creditor.amountMinor -= amountMinor;
    debtor.amountMinor -= amountMinor;

    if (creditor.amountMinor === 0) {
      creditorIndex += 1;
    }

    if (debtor.amountMinor === 0) {
      debtorIndex += 1;
    }
  }

  if (
    creditors.some((creditor) => creditor.amountMinor !== 0) ||
    debtors.some((debtor) => debtor.amountMinor !== 0)
  ) {
    throw new Error("Settlement transfers could not fully resolve balances.");
  }

  return transfers;
}
