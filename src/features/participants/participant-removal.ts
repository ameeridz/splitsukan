import type { ParticipantId } from "./participant-model";
import type { SessionRecord } from "../sessions/session-model";

export type ParticipantRemovalMode = "delete" | "archive";

export function hasParticipantFinancialReferences(
  session: SessionRecord,
  participantId: ParticipantId,
) {
  const referencedByExpense = session.expenses.some(
    (expense) =>
      expense.paidByParticipantId === participantId ||
      expense.allocations.some(
        (allocation) => allocation.participantId === participantId,
      ),
  );
  const referencedByRepayment = session.repayments.some(
    (repayment) =>
      repayment.fromParticipantId === participantId ||
      repayment.toParticipantId === participantId,
  );

  return referencedByExpense || referencedByRepayment;
}

export function getParticipantRemovalMode(
  session: SessionRecord,
  participantId: ParticipantId,
): ParticipantRemovalMode {
  return hasParticipantFinancialReferences(session, participantId)
    ? "archive"
    : "delete";
}
