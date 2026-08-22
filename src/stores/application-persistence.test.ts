import { describe, expect, it } from "vitest";

import {
  emptyPersistedApplicationState,
  restorePersistedApplicationState,
} from "./application-persistence";
import type { SessionRecord } from "../features/sessions/session-model";

function createSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    activityType: "badminton",
    customActivityName: null,
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: null,
    currency: "MYR",
    status: "draft",
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

describe("restorePersistedApplicationState", () => {
  it("restores valid version 1 data", () => {
    const session = createSession();

    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 1, sessions: [session] });
  });

  it("returns empty state for null", () => {
    expect(restorePersistedApplicationState(null)).toEqual(
      emptyPersistedApplicationState,
    );
  });

  it("returns empty state for malformed root data", () => {
    expect(restorePersistedApplicationState("invalid-data")).toEqual(
      emptyPersistedApplicationState,
    );
  });

  it("rejects an unsupported schema version", () => {
    expect(
      restorePersistedApplicationState({ schemaVersion: 99, sessions: [] }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a non-array sessions value", () => {
    expect(
      restorePersistedApplicationState({ schemaVersion: 1, sessions: {} }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid activity", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [createSession({ activityType: "badminton" }), { ...createSession(), activityType: "invalid" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid currency", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [{ ...createSession(), currency: "USD" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid status", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [{ ...createSession(), status: "unknown" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });
});
