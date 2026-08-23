import type {
  ExpenseAllocation,
  ExpenseParticipantInput,
} from "./expense-model";

type CalculateExpenseAllocationsInput = {
  expenseId: string;
  amountMinor: number;
  participants: ExpenseParticipantInput[];
};

type WeightedParticipant = ExpenseParticipantInput & {
  allocationOrder: number;
  baseShareAmountMinor: number;
  remainderNumerator: number;
};

export function calculateExpenseAllocations({
  expenseId,
  amountMinor,
  participants,
}: CalculateExpenseAllocationsInput): ExpenseAllocation[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Expense amount must be a positive integer in minor units.");
  }

  if (participants.length === 0) {
    throw new Error("At least one participant is required for allocation.");
  }

  const participantIds = new Set<string>();

  for (const participant of participants) {
    if (!participant.participantId) {
      throw new Error("Every allocation participant must have an ID.");
    }

    if (participantIds.has(participant.participantId)) {
      throw new Error("Duplicate participants are not allowed in an expense.");
    }

    if (!Number.isSafeInteger(participant.weightUnits) || participant.weightUnits <= 0) {
      throw new Error("Allocation weight must be a positive integer.");
    }

    participantIds.add(participant.participantId);
  }

  const totalWeightUnits = participants.reduce(
    (total, participant) => total + participant.weightUnits,
    0,
  );

  if (!Number.isSafeInteger(totalWeightUnits) || totalWeightUnits <= 0) {
    throw new Error("Total allocation weight must be a positive safe integer.");
  }

  const weightedParticipants: WeightedParticipant[] = participants.map(
    (participant, allocationOrder) => {
      const weightedAmount = amountMinor * participant.weightUnits;

      if (!Number.isSafeInteger(weightedAmount)) {
        throw new Error("Weighted expense amount exceeds the safe integer range.");
      }

      return {
        ...participant,
        allocationOrder,
        baseShareAmountMinor: Math.floor(weightedAmount / totalWeightUnits),
        remainderNumerator: weightedAmount % totalWeightUnits,
      };
    },
  );

  const allocatedBaseAmount = weightedParticipants.reduce(
    (total, participant) => total + participant.baseShareAmountMinor,
    0,
  );
  const remainderMinor = amountMinor - allocatedBaseAmount;

  const remainderRecipients = [...weightedParticipants]
    .sort((first, second) => {
      if (second.remainderNumerator !== first.remainderNumerator) {
        return second.remainderNumerator - first.remainderNumerator;
      }

      return first.allocationOrder - second.allocationOrder;
    })
    .slice(0, remainderMinor)
    .map((participant) => participant.participantId);
  const remainderRecipientIds = new Set(remainderRecipients);

  return weightedParticipants.map((participant) => ({
    id: `${expenseId}:allocation:${participant.allocationOrder}`,
    participantId: participant.participantId,
    weightUnits: participant.weightUnits,
    shareAmountMinor:
      participant.baseShareAmountMinor +
      (remainderRecipientIds.has(participant.participantId) ? 1 : 0),
    allocationOrder: participant.allocationOrder,
  }));
}
