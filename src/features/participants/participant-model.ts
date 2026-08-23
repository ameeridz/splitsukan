export const participationWeightUnits = {
  full: 1000,
  half: 500,
} as const;

export type ParticipationWeight = keyof typeof participationWeightUnits;
export type ParticipantId = string;

export type SessionParticipant = {
  id: ParticipantId;
  displayName: string;
  normalizedName: string;
  defaultWeightUnits: number;
  participantOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ParticipantInput = {
  displayName: string;
  participationWeight: ParticipationWeight;
};

export type CreateSessionParticipantInput = ParticipantInput & {
  id: ParticipantId;
  participantOrder: number;
  timestamp: string;
};

export type UpdateSessionParticipantInput = ParticipantInput & {
  participant: SessionParticipant;
  timestamp: string;
};

export type ParticipantMutationFailureReason =
  | "session-not-found"
  | "participant-not-found"
  | "invalid-name"
  | "duplicate-name";

export type ParticipantMutationResult =
  | {
      ok: true;
      participant: SessionParticipant;
    }
  | {
      ok: false;
      reason: ParticipantMutationFailureReason;
    };

export function normalizeParticipantName(displayName: string) {
  return normalizeParticipantDisplayName(displayName).toLocaleLowerCase("en-MY");
}

export function normalizeParticipantDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ");
}

export function getParticipationWeightUnits(
  participationWeight: ParticipationWeight,
) {
  return participationWeightUnits[participationWeight];
}

export function getParticipationWeightLabel(weightUnits: number) {
  return weightUnits === participationWeightUnits.half ? "Half" : "Full";
}

export function createSessionParticipant({
  id,
  displayName,
  participationWeight,
  participantOrder,
  timestamp,
}: CreateSessionParticipantInput): SessionParticipant {
  const normalizedDisplayName = normalizeParticipantDisplayName(displayName);

  return {
    id,
    displayName: normalizedDisplayName,
    normalizedName: normalizeParticipantName(normalizedDisplayName),
    defaultWeightUnits: getParticipationWeightUnits(participationWeight),
    participantOrder,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateSessionParticipant({
  participant,
  displayName,
  participationWeight,
  timestamp,
}: UpdateSessionParticipantInput): SessionParticipant {
  const normalizedDisplayName = normalizeParticipantDisplayName(displayName);

  return {
    ...participant,
    displayName: normalizedDisplayName,
    normalizedName: normalizeParticipantName(normalizedDisplayName),
    defaultWeightUnits: getParticipationWeightUnits(participationWeight),
    updatedAt: timestamp,
  };
}
