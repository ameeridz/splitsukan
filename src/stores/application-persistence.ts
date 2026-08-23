import {
  expenseStatuses,
  type ExpenseAllocation,
  type SessionExpense,
} from "../features/expenses/expense-model";
import { participationWeightUnits } from "../features/participants/participant-model";
import { activityOptions } from "../features/sessions/session-form-model";
import {
  sessionStatuses,
  supportedCurrencyCodes,
  type SessionRecord,
} from "../features/sessions/session-model";

export const currentApplicationSchemaVersion = 3;

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

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isParticipant(value: unknown) {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.normalizedName === "string" &&
    (value.defaultWeightUnits === participationWeightUnits.full ||
      value.defaultWeightUnits === participationWeightUnits.half) &&
    isNonNegativeSafeInteger(value.participantOrder) &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isExpenseAllocation(value: unknown): value is ExpenseAllocation {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.participantId === "string" &&
    isPositiveSafeInteger(value.weightUnits) &&
    isNonNegativeSafeInteger(value.shareAmountMinor) &&
    isNonNegativeSafeInteger(value.allocationOrder)
  );
}

function isSessionExpense(value: unknown): value is SessionExpense {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    isPositiveSafeInteger(value.amountMinor) &&
    typeof value.paidByParticipantId === "string" &&
    Array.isArray(value.allocations) &&
    value.allocations.length > 0 &&
    value.allocations.every(isExpenseAllocation) &&
    expenseStatuses.includes(value.status as never) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!isRecord(value)) return false;

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
    Array.isArray(value.expenses) &&
    value.expenses.every(isSessionExpense) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isNullableString(value.settledAt)
  );
}

function migrateLegacyState(
  value: Record<string, unknown>,
  sourceVersion: 1 | 2,
): PersistedApplicationState {
  if (!Array.isArray(value.sessions)) return emptyPersistedApplicationState;

  const migratedSessions = value.sessions.map((session) => {
    if (!isRecord(session)) return session;

    return {
      ...session,
      participants:
        sourceVersion === 1
          ? []
          : Array.isArray(session.participants)
            ? session.participants
            : [],
      expenses: [],
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
  if (!isRecord(persistedState)) return emptyPersistedApplicationState;

  if (persistedState.schemaVersion === 1) {
    return migrateLegacyState(persistedState, 1);
  }

  if (persistedState.schemaVersion === 2) {
    return migrateLegacyState(persistedState, 2);
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
