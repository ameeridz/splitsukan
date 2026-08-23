import type { ParticipantId } from "../participants/participant-model";

export type RepaymentId = string;

export const repaymentStatuses = ["completed", "void"] as const;
export type RepaymentStatus = (typeof repaymentStatuses)[number];

export type SessionRepayment = {
  id: RepaymentId;
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amountMinor: number;
  note: string | null;
  status: RepaymentStatus;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RepaymentInput = {
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amountMinor: number;
  note: string;
};

export type RepaymentMutationFailureReason =
  | "session-not-found"
  | "repayment-not-found"
  | "invalid-participant"
  | "same-participant"
  | "invalid-amount"
  | "no-outstanding-transfer"
  | "amount-exceeds-outstanding";

export type RepaymentMutationResult =
  | {
      ok: true;
      repayment: SessionRepayment;
    }
  | {
      ok: false;
      reason: RepaymentMutationFailureReason;
    };

export type CreateSessionRepaymentInput = RepaymentInput & {
  id: RepaymentId;
  timestamp: string;
};

export type UpdateSessionRepaymentInput = RepaymentInput & {
  repayment: SessionRepayment;
  timestamp: string;
};

export function normalizeRepaymentNote(note: string) {
  return note.trim().replace(/\s+/g, " ") || null;
}

export function createSessionRepayment({
  id,
  fromParticipantId,
  toParticipantId,
  amountMinor,
  note,
  timestamp,
}: CreateSessionRepaymentInput): SessionRepayment {
  return {
    id,
    fromParticipantId,
    toParticipantId,
    amountMinor,
    note: normalizeRepaymentNote(note),
    status: "completed",
    completedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateSessionRepayment({
  repayment,
  fromParticipantId,
  toParticipantId,
  amountMinor,
  note,
  timestamp,
}: UpdateSessionRepaymentInput): SessionRepayment {
  return {
    ...repayment,
    fromParticipantId,
    toParticipantId,
    amountMinor,
    note: normalizeRepaymentNote(note),
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  };
}
