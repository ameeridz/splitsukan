import type { ParticipantId } from "../participants/participant-model";
import type { SessionRecord } from "../sessions/session-model";

export type ParticipantBalance = {
  participantId: ParticipantId;
  paidAmountMinor: number;
  owedAmountMinor: number;
  repaymentSentAmountMinor: number;
  repaymentReceivedAmountMinor: number;
  netAmountMinor: number;
};

export type SessionBalanceSummary = {
  totalActiveExpenseAmountMinor: number;
  totalPaidAmountMinor: number;
  totalOwedAmountMinor: number;
  totalCompletedRepaymentAmountMinor: number;
  balances: ParticipantBalance[];
};

export function calculateSessionBalances(
  session: SessionRecord,
): SessionBalanceSummary {
  const referencedParticipantIds = new Set<ParticipantId>();

  for (const expense of session.expenses) {
    if (expense.status !== "active") continue;
    referencedParticipantIds.add(expense.paidByParticipantId);
    for (const allocation of expense.allocations) {
      referencedParticipantIds.add(allocation.participantId);
    }
  }

  for (const repayment of session.repayments) {
    if (repayment.status !== "completed") continue;
    referencedParticipantIds.add(repayment.fromParticipantId);
    referencedParticipantIds.add(repayment.toParticipantId);
  }

  const includedParticipants = [...session.participants]
    .filter(
      (participant) =>
        participant.isActive || referencedParticipantIds.has(participant.id),
    )
    .sort(
      (first, second) =>
        first.participantOrder - second.participantOrder,
    );

  const balanceByParticipantId = new Map<ParticipantId, ParticipantBalance>(
    includedParticipants.map((participant) => [
      participant.id,
      {
        participantId: participant.id,
        paidAmountMinor: 0,
        owedAmountMinor: 0,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: 0,
      },
    ]),
  );

  let totalActiveExpenseAmountMinor = 0;
  let totalCompletedRepaymentAmountMinor = 0;

  for (const expense of session.expenses) {
    if (expense.status !== "active") continue;

    totalActiveExpenseAmountMinor += expense.amountMinor;

    const payerBalance = balanceByParticipantId.get(
      expense.paidByParticipantId,
    );
    if (payerBalance) {
      payerBalance.paidAmountMinor += expense.amountMinor;
    }

    for (const allocation of expense.allocations) {
      const participantBalance = balanceByParticipantId.get(
        allocation.participantId,
      );
      if (participantBalance) {
        participantBalance.owedAmountMinor += allocation.shareAmountMinor;
      }
    }
  }

  for (const repayment of session.repayments) {
    if (repayment.status !== "completed") continue;

    const senderBalance = balanceByParticipantId.get(
      repayment.fromParticipantId,
    );
    const recipientBalance = balanceByParticipantId.get(
      repayment.toParticipantId,
    );

    if (!senderBalance || !recipientBalance) continue;

    senderBalance.repaymentSentAmountMinor += repayment.amountMinor;
    recipientBalance.repaymentReceivedAmountMinor += repayment.amountMinor;
    totalCompletedRepaymentAmountMinor += repayment.amountMinor;
  }

  const balances = includedParticipants.map((participant) => {
    const balance = balanceByParticipantId.get(participant.id);
    if (!balance) {
      throw new Error("Participant balance could not be initialized.");
    }

    return {
      ...balance,
      netAmountMinor:
        balance.paidAmountMinor -
        balance.owedAmountMinor +
        balance.repaymentSentAmountMinor -
        balance.repaymentReceivedAmountMinor,
    };
  });

  return {
    totalActiveExpenseAmountMinor,
    totalPaidAmountMinor: balances.reduce(
      (total, balance) => total + balance.paidAmountMinor,
      0,
    ),
    totalOwedAmountMinor: balances.reduce(
      (total, balance) => total + balance.owedAmountMinor,
      0,
    ),
    totalCompletedRepaymentAmountMinor,
    balances,
  };
}
