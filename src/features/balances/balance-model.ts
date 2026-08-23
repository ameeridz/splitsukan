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

function collectReferencedParticipantIds(session: SessionRecord) {
  const referencedParticipantIds: ParticipantId[] = [];
  const seenParticipantIds = new Set<ParticipantId>();

  function addParticipantId(participantId: ParticipantId) {
    if (!participantId || seenParticipantIds.has(participantId)) return;

    seenParticipantIds.add(participantId);
    referencedParticipantIds.push(participantId);
  }

  for (const expense of session.expenses) {
    if (expense.status !== "active") continue;

    addParticipantId(expense.paidByParticipantId);

    for (const allocation of [...expense.allocations].sort(
      (first, second) => first.allocationOrder - second.allocationOrder,
    )) {
      addParticipantId(allocation.participantId);
    }
  }

  for (const repayment of session.repayments) {
    if (repayment.status !== "completed") continue;

    addParticipantId(repayment.fromParticipantId);
    addParticipantId(repayment.toParticipantId);
  }

  return referencedParticipantIds;
}

export function calculateSessionBalances(
  session: SessionRecord,
): SessionBalanceSummary {
  const referencedParticipantIds = collectReferencedParticipantIds(session);
  const referencedParticipantIdSet = new Set(referencedParticipantIds);
  const knownParticipantIds = new Set(
    session.participants.map((participant) => participant.id),
  );
  const includedParticipantIds = [
    ...[...session.participants]
      .filter(
        (participant) =>
          participant.isActive || referencedParticipantIdSet.has(participant.id),
      )
      .sort(
        (first, second) =>
          first.participantOrder - second.participantOrder,
      )
      .map((participant) => participant.id),
    ...referencedParticipantIds.filter(
      (participantId) => !knownParticipantIds.has(participantId),
    ),
  ];

  const balanceByParticipantId = new Map<ParticipantId, ParticipantBalance>(
    includedParticipantIds.map((participantId) => [
      participantId,
      {
        participantId,
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

  const balances = includedParticipantIds.map((participantId) => {
    const balance = balanceByParticipantId.get(participantId);
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
