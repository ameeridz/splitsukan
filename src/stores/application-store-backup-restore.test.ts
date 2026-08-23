import { afterEach, describe, expect, it } from "vitest";

import type { SessionRecord } from "../features/sessions/session-model";
import {
  applicationSchemaVersion,
  useApplicationStore,
} from "./application-store";

const timestamp = "2026-08-23T10:51:30.000Z";

function createSession(): SessionRecord {
  return {
    id: "restored-session",
    activityType: "futsal",
    customActivityName: null,
    date: "2026-08-25",
    startTime: "20:30",
    venue: "The Roof",
    note: null,
    currency: "MYR",
    status: "draft",
    participants: [],
    expenses: [],
    repayments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    settledAt: null,
  };
}

describe("restoreBackupSessions", () => {
  afterEach(() => {
    useApplicationStore.getState().resetStore();
  });

  it("fully replaces current sessions with validated backup sessions", () => {
    const restoredSession = createSession();

    useApplicationStore.getState().restoreBackupSessions([restoredSession]);

    const state = useApplicationStore.getState();
    expect(state.schemaVersion).toBe(applicationSchemaVersion);
    expect(state.sessions).toEqual([restoredSession]);
    expect(state.hasHydrated).toBe(true);
  });

  it("does not share nested references with the supplied backup data", () => {
    const restoredSession = createSession();
    const suppliedSessions = [restoredSession];

    useApplicationStore.getState().restoreBackupSessions(suppliedSessions);

    const storedSessions = useApplicationStore.getState().sessions;
    expect(storedSessions).not.toBe(suppliedSessions);
    expect(storedSessions[0]).not.toBe(restoredSession);
    expect(storedSessions[0]?.participants).not.toBe(
      restoredSession.participants,
    );
  });

  it("supports restoring a valid empty backup", () => {
    useApplicationStore.getState().restoreBackupSessions([createSession()]);
    useApplicationStore.getState().restoreBackupSessions([]);

    expect(useApplicationStore.getState().sessions).toEqual([]);
  });
});
