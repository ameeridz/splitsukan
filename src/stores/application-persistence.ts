import { participationWeightUnits } from "../features/participants/participant-model";
import { activityOptions } from "../features/sessions/session-form-model";
import {
  sessionStatuses,
  supportedCurrencyCodes,
  type SessionRecord,
} from "../features/sessions/session-model";

export const currentApplicationSchemaVersion = 2;

export type PersistedApplicationState = {
  schemaVersion: number;
  sessions: SessionRecord[];
};

export const emptyPersistedApplicationState: PersistedApplicationState = {
  schemaVersion: currentApplicationSchemaVersion,
  sessions: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isParticipant(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.normalizedName === "string" &&
    (value.defaultWeightUnits === participationWeightUnits.full ||
      value.defaultWeightUnits === participationWeightUnits.half) &&
    typeof value.participantOrder === "number" &&
    Number.isInteger(value.participantOrder) &&
    value.participantOrder >= 0 &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!isRecord(value)) {
    return false;
  }

  const validActivities = activityOptions.map((option) => option.value);

  return (
    typeof value.id === "string" &&
    validActivities.includes(value.activityType as never) &&
    isNullableString(value.customActivityName) &&
    typeof value.date === "string" &&
    typeof value.startTime === "string" &&
    typeof value.venue === "string" &&
    isNullableString(value.note) &&
    supportedCurrencyCodes.includes(value.currency as never) &&
    sessionStatuses.includes(value.status as never) &&
    Array.isArray(value.participants) &&
    value.participants.every(isParticipant) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isNullableString(value.settledAt)
  );
}

function migrateVersionOneState(
  value: Record<string, unknown>,
): PersistedApplicationState {
  if (!Array.isArray(value.sessions)) {
    return emptyPersistedApplicationState;
  }

  const migratedSessions = value.sessions.map((session) => {
    if (!isRecord(session)) {
      return session;
    }

    return {
      ...session,
      participants: [],
    };
  });

  const migratedState = {
    schemaVersion: currentApplicationSchemaVersion,
    sessions: migratedSessions,
  };

  return migratedState.sessions.every(isSessionRecord)
    ? migratedState
    : emptyPersistedApplicationState;
}

export function restorePersistedApplicationState(
  persistedState: unknown,
): PersistedApplicationState {
  if (!isRecord(persistedState)) {
    return emptyPersistedApplicationState;
  }

  if (persistedState.schemaVersion === 1) {
    return migrateVersionOneState(persistedState);
  }

  if (persistedState.schemaVersion !== currentApplicationSchemaVersion) {
    return emptyPersistedApplicationState;
  }

  if (!Array.isArray(persistedState.sessions)) {
    return emptyPersistedApplicationState;
  }

  if (!persistedState.sessions.every(isSessionRecord)) {
    return emptyPersistedApplicationState;
  }

  return {
    schemaVersion: currentApplicationSchemaVersion,
    sessions: persistedState.sessions,
  };
}
