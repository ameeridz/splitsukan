import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applicationSchemaVersion,
  useApplicationStore,
} from "./application-store";
import type { SessionFormValues } from "../features/sessions/session-form-model";

const firstSessionId = "11111111-2222-4333-8444-555555555555";
const secondSessionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const createdTimestamp = "2026-08-22T12:00:00.000Z";
const updatedTimestamp = "2026-08-22T13:30:00.000Z";

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

describe("useApplicationStore session CRUD actions", () => {
  beforeEach(() => {
    useApplicationStore.getState().resetStore();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(firstSessionId);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(createdTimestamp));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useApplicationStore.getState().resetStore();
  });

  it("updates an existing session and preserves immutable metadata", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    vi.setSystemTime(new Date(updatedTimestamp));

    const updatedSession = useApplicationStore.getState().updateSession(
      createdSession.id,
      createValidSessionValues({
        activityType: "futsal",
        date: "2026-09-01",
        startTime: "20:30",
        venue: "  Arena Sports Hub  ",
        note: "  Bring bibs  ",
      }),
    );

    expect(updatedSession).toEqual({
      ...createdSession,
      activityType: "futsal",
      customActivityName: null,
      date: "2026-09-01",
      startTime: "20:30",
      venue: "Arena Sports Hub",
      note: "Bring bibs",
      updatedAt: updatedTimestamp,
    });
    expect(updatedSession?.id).toBe(createdSession.id);
    expect(updatedSession?.createdAt).toBe(createdTimestamp);
    expect(updatedSession?.currency).toBe("MYR");
    expect(updatedSession?.status).toBe("draft");
    expect(updatedSession?.settledAt).toBeNull();
  });

  it("normalizes a custom activity during update", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    vi.setSystemTime(new Date(updatedTimestamp));

    const updatedSession = useApplicationStore.getState().updateSession(
      createdSession.id,
      createValidSessionValues({
        activityType: "other",
        customActivityName: "  Football  ",
        note: "   ",
      }),
    );

    expect(updatedSession?.activityType).toBe("other");
    expect(updatedSession?.customActivityName).toBe("Football");
    expect(updatedSession?.note).toBeNull();
    expect(updatedSession?.updatedAt).toBe(updatedTimestamp);
  });

  it("replaces only the matching session during update", () => {
    const randomUUIDMock = vi.mocked(globalThis.crypto.randomUUID);
    randomUUIDMock
      .mockReturnValueOnce(firstSessionId)
      .mockReturnValueOnce(secondSessionId);

    const firstSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const secondSession = useApplicationStore.getState().createSession(
      createValidSessionValues({
        activityType: "pickleball",
        venue: "Community Court",
      }),
    );

    vi.setSystemTime(new Date(updatedTimestamp));

    const previousSessions = useApplicationStore.getState().sessions;
    useApplicationStore.getState().updateSession(
      firstSession.id,
      createValidSessionValues({ venue: "Updated Venue" }),
    );
    const nextSessions = useApplicationStore.getState().sessions;

    expect(nextSessions).not.toBe(previousSessions);
    expect(nextSessions).toHaveLength(2);
    expect(nextSessions[0]?.venue).toBe("Updated Venue");
    expect(nextSessions[1]).toBe(secondSession);
  });

  it("returns undefined and preserves state for an unknown update ID", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const previousSessions = useApplicationStore.getState().sessions;

    const result = useApplicationStore
      .getState()
      .updateSession("unknown-session-id", createValidSessionValues());

    expect(result).toBeUndefined();
    expect(useApplicationStore.getState().sessions).toBe(previousSessions);
    expect(useApplicationStore.getState().sessions).toEqual([createdSession]);
  });

  it("deletes an existing session and returns true", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    const result = useApplicationStore
      .getState()
      .deleteSession(createdSession.id);

    expect(result).toBe(true);
    expect(useApplicationStore.getState().sessions).toEqual([]);
  });

  it("deletes only the matching session", () => {
    const randomUUIDMock = vi.mocked(globalThis.crypto.randomUUID);
    randomUUIDMock
      .mockReturnValueOnce(firstSessionId)
      .mockReturnValueOnce(secondSessionId);

    const firstSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const secondSession = useApplicationStore.getState().createSession(
      createValidSessionValues({
        activityType: "futsal",
        venue: "Arena Sports Hub",
      }),
    );

    const result = useApplicationStore
      .getState()
      .deleteSession(firstSession.id);

    expect(result).toBe(true);
    expect(useApplicationStore.getState().sessions).toEqual([secondSession]);
  });

  it("returns false and preserves state for an unknown delete ID", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());
    const previousSessions = useApplicationStore.getState().sessions;

    const result = useApplicationStore
      .getState()
      .deleteSession("unknown-session-id");

    expect(result).toBe(false);
    expect(useApplicationStore.getState().sessions).toBe(previousSessions);
    expect(useApplicationStore.getState().sessions).toEqual([createdSession]);
  });

  it("preserves schema version after update and delete actions", () => {
    const createdSession = useApplicationStore
      .getState()
      .createSession(createValidSessionValues());

    useApplicationStore.getState().updateSession(
      createdSession.id,
      createValidSessionValues({ venue: "Updated Venue" }),
    );

    expect(useApplicationStore.getState().schemaVersion).toBe(
      applicationSchemaVersion,
    );

    useApplicationStore.getState().deleteSession(createdSession.id);

    expect(useApplicationStore.getState().schemaVersion).toBe(
      applicationSchemaVersion,
    );
  });
});
