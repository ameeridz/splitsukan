import {
  sessionStatuses,
  supportedCurrencyCodes,
  type SessionRecord,
} from "../features/sessions/session-model";
import { activityOptions } from "../features/sessions/session-form-model";

export type PersistedApplicationState = {
  schemaVersion: number;
  sessions: SessionRecord[];
};

export const emptyPersistedApplicationState: PersistedApplicationState = {
  schemaVersion: 1,
  sessions: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
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
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isNullableString(value.settledAt)
  );
}

export function restorePersistedApplicationState(
  persistedState: unknown,
): PersistedApplicationState {
  if (!isRecord(persistedState)) {
    return emptyPersistedApplicationState;
  }

  if (persistedState.schemaVersion !== 1) {
    return emptyPersistedApplicationState;
  }

  if (!Array.isArray(persistedState.sessions)) {
    return emptyPersistedApplicationState;
  }

  if (!persistedState.sessions.every(isSessionRecord)) {
    return emptyPersistedApplicationState;
  }

  return {
    schemaVersion: 1,
    sessions: persistedState.sessions,
  };
}
