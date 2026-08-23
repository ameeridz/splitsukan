import type { SessionParticipant } from "../participants/participant-model";
import {
  getActivityLabel,
  isCustomActivity,
  type ActivityType,
  type SessionFormValues,
} from "./session-form-model";

export const supportedCurrencyCodes = ["MYR"] as const;
export const sessionStatuses = ["draft", "active", "settled"] as const;

export type CurrencyCode = (typeof supportedCurrencyCodes)[number];
export type SessionStatus = (typeof sessionStatuses)[number];
export type SessionId = string;

export type SessionRecord = {
  id: SessionId;
  activityType: ActivityType;
  customActivityName: string | null;
  date: string;
  startTime: string;
  venue: string;
  note: string | null;
  currency: CurrencyCode;
  status: SessionStatus;
  participants: SessionParticipant[];
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
};

export type CreateSessionRecordInput = {
  id: SessionId;
  values: SessionFormValues;
  timestamp: string;
};

export type UpdateSessionRecordInput = {
  session: SessionRecord;
  values: SessionFormValues;
  timestamp: string;
};

function normalizeSessionValues(values: SessionFormValues) {
  return {
    activityType: values.activityType,
    customActivityName: isCustomActivity(values.activityType)
      ? values.customActivityName.trim()
      : null,
    date: values.date,
    startTime: values.startTime,
    venue: values.venue.trim(),
    note: values.note.trim() || null,
  };
}

export function createSessionRecord({
  id,
  values,
  timestamp,
}: CreateSessionRecordInput): SessionRecord {
  return {
    id,
    ...normalizeSessionValues(values),
    currency: "MYR",
    status: "draft",
    participants: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    settledAt: null,
  };
}

export function updateSessionRecord({
  session,
  values,
  timestamp,
}: UpdateSessionRecordInput): SessionRecord {
  return {
    ...session,
    ...normalizeSessionValues(values),
    updatedAt: timestamp,
  };
}

export function getSessionActivityName(session: SessionRecord) {
  if (isCustomActivity(session.activityType)) {
    return session.customActivityName ?? "Other";
  }

  return getActivityLabel(session.activityType);
}
