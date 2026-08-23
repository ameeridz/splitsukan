import { calculateSessionBalances } from "../balances/balance-model";
import { calculateSettlementTransfers } from "../balances/settlement-model";
import type { SessionRecord, SessionStatus } from "./session-model";

export type SessionSettlementEvaluation = {
  status: SessionStatus;
  settledAt: string | null;
  isFullySettled: boolean;
  hasActiveExpenses: boolean;
  outstandingTransferCount: number;
  outstandingAmountMinor: number;
};

type EvaluateSessionSettlementInput = {
  session: SessionRecord;
  timestamp: string;
};

export function evaluateSessionSettlement({
  session,
  timestamp,
}: EvaluateSessionSettlementInput): SessionSettlementEvaluation {
  const balanceSummary = calculateSessionBalances(session);
  const transfers = calculateSettlementTransfers(balanceSummary.balances);
  const hasActiveExpenses = balanceSummary.totalActiveExpenseAmountMinor > 0;
  const isFullySettled = hasActiveExpenses && transfers.length === 0;
  const outstandingAmountMinor = transfers.reduce(
    (total, transfer) => total + transfer.amountMinor,
    0,
  );

  if (isFullySettled) {
    return {
      status: "settled",
      settledAt: session.settledAt ?? timestamp,
      isFullySettled: true,
      hasActiveExpenses: true,
      outstandingTransferCount: 0,
      outstandingAmountMinor: 0,
    };
  }

  return {
    status: hasActiveExpenses ? "active" : "draft",
    settledAt: null,
    isFullySettled: false,
    hasActiveExpenses,
    outstandingTransferCount: transfers.length,
    outstandingAmountMinor,
  };
}

export function applySessionSettlementStatus(
  session: SessionRecord,
  timestamp: string,
): SessionRecord {
  const evaluation = evaluateSessionSettlement({ session, timestamp });

  return {
    ...session,
    status: evaluation.status,
    settledAt: evaluation.settledAt,
  };
}
