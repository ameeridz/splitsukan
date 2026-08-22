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
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
};

export type CreateSessionRecordInput = {
  id: SessionId;
  values: SessionFormValues;
  timestamp: string;
};

export function createSessionRecord({
  id,
  values,
  timestamp,
}: CreateSessionRecordInput): SessionRecord {
  const customActivityName = isCustomActivity(values.activityType)
    ? values.customActivityName.trim()
    : null;
  const note = values.note.trim() || null;

  return {
    id,
    activityType: values.activityType,
    customActivityName,
    date: values.date,
    startTime: values.startTime,
    venue: values.venue.trim(),
    note,
    currency: "MYR",
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    settledAt: null,
  };
}

export function getSessionActivityName(session: SessionRecord) {
  if (isCustomActivity(session.activityType)) {
    return session.customActivityName ?? "Other";
  }

  return getActivityLabel(session.activityType);
}
