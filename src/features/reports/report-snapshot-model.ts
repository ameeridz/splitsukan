import { calculateSessionBalances } from "../balances/balance-model";
import { calculateSettlementTransfers } from "../balances/settlement-model";
import type { SessionRecord } from "../sessions/session-model";
import { getSessionActivityName } from "../sessions/session-model";

export type ReportState = "draft" | "outstanding" | "settled";

export type ReportParticipantSnapshot = {
  id: string;
  displayName: string;
  defaultWeightUnits: number;
  participantOrder: number;
  isActive: boolean;
};

export type ReportAllocationSnapshot = {
  participantId: string;
  participantName: string;
  weightUnits: number;
  shareAmountMinor: number;
  allocationOrder: number;
};

export type ReportExpenseSnapshot = {
  id: string;
  description: string;
  amountMinor: number;
  payerParticipantId: string;
  payerName: string;
  status: "active" | "void";
  allocations: ReportAllocationSnapshot[];
  createdAt: string;
  updatedAt: string;
};

export type ReportBalanceSnapshot = {
  participantId: string;
  participantName: string;
  paidAmountMinor: number;
  owedAmountMinor: number;
  repaymentSentAmountMinor: number;
  repaymentReceivedAmountMinor: number;
  netAmountMinor: number;
};

export type ReportTransferSnapshot = {
  fromParticipantId: string;
  fromParticipantName: string;
  toParticipantId: string;
  toParticipantName: string;
  amountMinor: number;
  transferOrder: number;
};

export type ReportRepaymentSnapshot = {
  id: string;
  fromParticipantId: string;
  fromParticipantName: string;
  toParticipantId: string;
  toParticipantName: string;
  amountMinor: number;
  note: string | null;
  status: "completed" | "void";
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionReportSnapshot = {
  generatedAt: string;
  reportState: ReportState;
  session: {
    id: string;
    activityName: string;
    date: string;
    startTime: string;
    venue: string;
    note: string | null;
    currency: "MYR";
    status: "draft" | "active" | "settled";
    settledAt: string | null;
  };
  totals: {
    participantCount: number;
    activeExpenseCount: number;
    activeExpenseAmountMinor: number;
    completedRepaymentCount: number;
    completedRepaymentAmountMinor: number;
    outstandingTransferCount: number;
    outstandingAmountMinor: number;
  };
  participants: ReportParticipantSnapshot[];
  expenses: ReportExpenseSnapshot[];
  balances: ReportBalanceSnapshot[];
  transfers: ReportTransferSnapshot[];
  repayments: ReportRepaymentSnapshot[];
};

type CreateSessionReportSnapshotInput = {
  session: SessionRecord;
  generatedAt: string;
};

function resolveParticipantName(
  participantById: Map<string, { displayName: string }>,
  participantId: string,
) {
  return participantById.get(participantId)?.displayName ?? "Unknown participant";
}

export function createSessionReportSnapshot({
  session,
  generatedAt,
}: CreateSessionReportSnapshotInput): SessionReportSnapshot {
  const participantById = new Map(
    session.participants.map((participant) => [participant.id, participant]),
  );
  const balanceSummary = calculateSessionBalances(session);
  const transfers = calculateSettlementTransfers(balanceSummary.balances);
  const activeExpenses = session.expenses.filter(
    (expense) => expense.status === "active",
  );
  const completedRepayments = session.repayments.filter(
    (repayment) => repayment.status === "completed",
  );
  const hasFinancialActivity =
    session.expenses.length > 0 || session.repayments.length > 0;
  const reportState: ReportState = !hasFinancialActivity
    ? "draft"
    : transfers.length > 0
      ? "outstanding"
      : "settled";

  const participants = [...session.participants]
    .sort(
      (first, second) =>
        first.participantOrder - second.participantOrder,
    )
    .map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      defaultWeightUnits: participant.defaultWeightUnits,
      participantOrder: participant.participantOrder,
      isActive: participant.isActive,
    }));

  const expenses = session.expenses.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amountMinor: expense.amountMinor,
    payerParticipantId: expense.paidByParticipantId,
    payerName: resolveParticipantName(
      participantById,
      expense.paidByParticipantId,
    ),
    status: expense.status,
    allocations: [...expense.allocations]
      .sort(
        (first, second) =>
          first.allocationOrder - second.allocationOrder,
      )
      .map((allocation) => ({
        participantId: allocation.participantId,
        participantName: resolveParticipantName(
          participantById,
          allocation.participantId,
        ),
        weightUnits: allocation.weightUnits,
        shareAmountMinor: allocation.shareAmountMinor,
        allocationOrder: allocation.allocationOrder,
      })),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  }));

  const balances = balanceSummary.balances.map((balance) => ({
    participantId: balance.participantId,
    participantName: resolveParticipantName(
      participantById,
      balance.participantId,
    ),
    paidAmountMinor: balance.paidAmountMinor,
    owedAmountMinor: balance.owedAmountMinor,
    repaymentSentAmountMinor: balance.repaymentSentAmountMinor,
    repaymentReceivedAmountMinor: balance.repaymentReceivedAmountMinor,
    netAmountMinor: balance.netAmountMinor,
  }));

  const transferSnapshots = transfers.map((transfer) => ({
    fromParticipantId: transfer.fromParticipantId,
    fromParticipantName: resolveParticipantName(
      participantById,
      transfer.fromParticipantId,
    ),
    toParticipantId: transfer.toParticipantId,
    toParticipantName: resolveParticipantName(
      participantById,
      transfer.toParticipantId,
    ),
    amountMinor: transfer.amountMinor,
    transferOrder: transfer.transferOrder,
  }));

  const repayments = session.repayments.map((repayment) => ({
    id: repayment.id,
    fromParticipantId: repayment.fromParticipantId,
    fromParticipantName: resolveParticipantName(
      participantById,
      repayment.fromParticipantId,
    ),
    toParticipantId: repayment.toParticipantId,
    toParticipantName: resolveParticipantName(
      participantById,
      repayment.toParticipantId,
    ),
    amountMinor: repayment.amountMinor,
    note: repayment.note,
    status: repayment.status,
    completedAt: repayment.completedAt,
    createdAt: repayment.createdAt,
    updatedAt: repayment.updatedAt,
  }));

  return {
    generatedAt,
    reportState,
    session: {
      id: session.id,
      activityName: getSessionActivityName(session),
      date: session.date,
      startTime: session.startTime,
      venue: session.venue,
      note: session.note,
      currency: session.currency,
      status: session.status,
      settledAt: session.settledAt,
    },
    totals: {
      participantCount: participants.filter((participant) => participant.isActive)
        .length,
      activeExpenseCount: activeExpenses.length,
      activeExpenseAmountMinor: activeExpenses.reduce(
        (total, expense) => total + expense.amountMinor,
        0,
      ),
      completedRepaymentCount: completedRepayments.length,
      completedRepaymentAmountMinor: completedRepayments.reduce(
        (total, repayment) => total + repayment.amountMinor,
        0,
      ),
      outstandingTransferCount: transferSnapshots.length,
      outstandingAmountMinor: transferSnapshots.reduce(
        (total, transfer) => total + transfer.amountMinor,
        0,
      ),
    },
    participants,
    expenses,
    balances,
    transfers: transferSnapshots,
    repayments,
  };
}
