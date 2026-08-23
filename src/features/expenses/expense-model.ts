import type { ParticipantId } from "../participants/participant-model";

export type ExpenseId = string;
export type ExpenseAllocationId = string;

export const expenseStatuses = ["active", "void"] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export type ExpenseAllocation = {
  id: ExpenseAllocationId;
  participantId: ParticipantId;
  weightUnits: number;
  shareAmountMinor: number;
  allocationOrder: number;
};

export type SessionExpense = {
  id: ExpenseId;
  description: string;
  amountMinor: number;
  paidByParticipantId: ParticipantId;
  allocations: ExpenseAllocation[];
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseParticipantInput = {
  participantId: ParticipantId;
  weightUnits: number;
};

export type ExpenseInput = {
  description: string;
  amountMinor: number;
  paidByParticipantId: ParticipantId;
  participants: ExpenseParticipantInput[];
};

export type ExpenseMutationFailureReason =
  | "session-not-found"
  | "expense-not-found"
  | "invalid-description"
  | "invalid-amount"
  | "invalid-payer"
  | "invalid-participants"
  | "duplicate-participant";

export type ExpenseMutationResult =
  | { ok: true; expense: SessionExpense }
  | { ok: false; reason: ExpenseMutationFailureReason };

export type CreateSessionExpenseInput = ExpenseInput & {
  id: ExpenseId;
  allocations: ExpenseAllocation[];
  timestamp: string;
};

export type UpdateSessionExpenseInput = ExpenseInput & {
  expense: SessionExpense;
  allocations: ExpenseAllocation[];
  timestamp: string;
};

export function normalizeExpenseDescription(description: string) {
  return description.trim().replace(/\s+/g, " ");
}

export function parseMoneyInputToMinorUnits(value: string) {
  const normalizedValue = value.trim().replace(/,/g, "");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) return null;

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");
  const amountMinor =
    Number.parseInt(wholePart, 10) * 100 +
    Number.parseInt(decimalPart.padEnd(2, "0"), 10);

  return Number.isSafeInteger(amountMinor) && amountMinor > 0
    ? amountMinor
    : null;
}

export function formatMoneyMinorUnits(amountMinor: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function createSessionExpense({
  id,
  description,
  amountMinor,
  paidByParticipantId,
  allocations,
  timestamp,
}: CreateSessionExpenseInput): SessionExpense {
  return {
    id,
    description: normalizeExpenseDescription(description),
    amountMinor,
    paidByParticipantId,
    allocations,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateSessionExpense({
  expense,
  description,
  amountMinor,
  paidByParticipantId,
  allocations,
  timestamp,
}: UpdateSessionExpenseInput): SessionExpense {
  return {
    ...expense,
    description: normalizeExpenseDescription(description),
    amountMinor,
    paidByParticipantId,
    allocations,
    status: "active",
    updatedAt: timestamp,
  };
}
