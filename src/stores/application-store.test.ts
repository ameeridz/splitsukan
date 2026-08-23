import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applicationSchemaVersion,
  useApplicationStore,
} from "./application-store";
import type { SessionFormValues } from "../features/sessions/session-form-model";

const fixedSessionId = "11111111-2222-4333-8444-555555555555";
const fixedTimestamp = "2026-08-23T05:00:00.000Z";

function createValidSessionValues(
  overrides: Partial<SessionFormValues> = {},
): SessionFormValues {
  return {
    activityType: "badminton",
    customActivityName: "",
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: "Court 3 and Court 4",
    ...overrides,
  };
}

describe("useApplicationStore", () => {
  beforeEach(() => {
    useApplicationStore.getState().resetStore();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(fixedSessionId);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixedTimestamp));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useApplicationStore.getState().resetStore();
  });

  it("starts with schema version 4 and no sessions", () => {
    const state = useApplicationStore.getState();

    expect(state.schemaVersion).toBe(applicationSchemaVersion);
    expect(state.schemaVersion).toBe(4);
    expect(state.sessions).toEqual([]);
  });

  it("creates a normalized Draft session with empty domain arrays", () => {
    const session = useApplicationStore.getState().createSession(
      createValidSessionValues({
        venue: "  ABC Badminton Centre  ",
        note: "  Court 3 and Court 4  ",
      }),
    );

    expect(session).toEqual({
      id: fixedSessionId,
      activityType: "badminton",
      customActivityName: null,
      date: "2026-08-29",
      startTime: "21:00",
      venue: "ABC Badminton Centre",
      note: "Court 3 and Court 4",
      currency: "MYR",
      status: "draft",
      participants: [],
      expenses: [],
      repayments: [],
      createdAt: fixedTimestamp,
      updatedAt: fixedTimestamp,
      settledAt: null,
    });
  });

  it("stores an empty optional note as null", () => {
    const session = useApplicationStore
      .getState()
      .createSession(createValidSessionValues({ note: "   " }));

    expect(session.note).toBeNull();
  });

  it("stores a trimmed custom activity name", () => {
    const session = useApplicationStore.getState().createSession(
      createValidSessionValues({
        activityType: "other",
        customActivityName: "  Basketball  ",
      }),
    );

    expect(session.activityType).toBe("other");
    expect(session.customActivityName).toBe("Basketball");
  });

  it("appends a session without mutating the previous array", () => {
    const previousSessions = useApplicationStore.getState().sessions;
    const session = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const nextSessions = useApplicationStore.getState().sessions;

    expect(previousSessions).toEqual([]);
    expect(nextSessions).not.toBe(previousSessions);
    expect(nextSessions).toEqual([session]);
  });

  it("returns the stored session from createSession", () => {
    const returnedSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const storedSession = useApplicationStore.getState().sessions[0];

    expect(returnedSession).toBe(storedSession);
  });

  it("finds a session by ID", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    expect(
      useApplicationStore.getState().getSessionById(createdSession.id),
    ).toBe(createdSession);
  });

  it("returns undefined for an unknown session ID", () => {
    expect(
      useApplicationStore.getState().getSessionById("unknown-session-id"),
    ).toBeUndefined();
  });

  it("resets sessions while preserving schema version 4", () => {
    useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    useApplicationStore.getState().resetStore();

    const state = useApplicationStore.getState();
    expect(state.schemaVersion).toBe(4);
    expect(state.sessions).toEqual([]);
  });
});
