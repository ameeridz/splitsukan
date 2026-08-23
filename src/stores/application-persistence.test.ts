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
    participants: [],
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    settledAt: null,
    ...overrides,
  };
}

describe("restorePersistedApplicationState", () => {
  it("restores valid version 2 data", () => {
    const session = createSession();

    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 2, sessions: [session] });
  });

  it("migrates version 1 sessions with an empty participants list", () => {
    const versionOneSession = createSession();
    const sessionWithoutParticipants: Record<string, unknown> = {
      ...versionOneSession,
    };
    delete sessionWithoutParticipants.participants;

    expect(
      restorePersistedApplicationState({
        schemaVersion: 1,
        sessions: [sessionWithoutParticipants],
      }),
    ).toEqual({
      schemaVersion: 2,
      sessions: [{ ...sessionWithoutParticipants, participants: [] }],
    });
  });

  it("restores valid participant data", () => {
    const session = createSession({
      participants: [
        {
          id: "participant-1",
          displayName: "Juan",
          normalizedName: "juan",
          defaultWeightUnits: 1000,
          participantOrder: 0,
          isActive: true,
          createdAt: "2026-08-23T01:00:00.000Z",
          updatedAt: "2026-08-23T01:00:00.000Z",
        },
      ],
    });

    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [session],
      }),
    ).toEqual({ schemaVersion: 2, sessions: [session] });
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
      restorePersistedApplicationState({ schemaVersion: 2, sessions: {} }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid activity", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [{ ...createSession(), activityType: "invalid" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid currency", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [{ ...createSession(), currency: "USD" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects a session with an invalid status", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [{ ...createSession(), status: "unknown" }],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });

  it("rejects participant data with an invalid weight", () => {
    expect(
      restorePersistedApplicationState({
        schemaVersion: 2,
        sessions: [
          {
            ...createSession(),
            participants: [
              {
                id: "participant-1",
                displayName: "Juan",
                normalizedName: "juan",
                defaultWeightUnits: 750,
                participantOrder: 0,
                isActive: true,
                createdAt: "2026-08-23T01:00:00.000Z",
                updatedAt: "2026-08-23T01:00:00.000Z",
              },
            ],
          },
        ],
      }),
    ).toEqual(emptyPersistedApplicationState);
  });
});
