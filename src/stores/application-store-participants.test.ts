import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApplicationStore } from "./application-store";
import type { SessionFormValues } from "../features/sessions/session-form-model";

const sessionId = "11111111-2222-4333-8444-555555555555";
const firstParticipantId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const secondParticipantId = "99999999-8888-4777-8666-555555555555";
const createdAt = "2026-08-23T02:00:00.000Z";
const updatedAt = "2026-08-23T03:00:00.000Z";

function validSessionValues(): SessionFormValues {
  return {
    activityType: "badminton",
    customActivityName: "",
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: "",
  };
}

describe("participant store actions", () => {
  beforeEach(() => {
    useApplicationStore.getState().resetStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(createdAt));
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(sessionId)
      .mockReturnValueOnce(firstParticipantId)
      .mockReturnValueOnce(secondParticipantId);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useApplicationStore.getState().resetStore();
  });

  it("adds a Full participant with normalized name and stable order", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    const result = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "  Juan   Ridzuan  ",
      participationWeight: "full",
    });

    expect(result).toEqual({
      ok: true,
      participant: {
        id: firstParticipantId,
        displayName: "Juan Ridzuan",
        normalizedName: "juan ridzuan",
        defaultWeightUnits: 1000,
        participantOrder: 0,
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
    });
    expect(useApplicationStore.getState().sessions[0]?.participants).toHaveLength(1);
  });

  it("adds a Half participant using the next stable order", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    const result = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Amir",
      participationWeight: "half",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.participant.defaultWeightUnits).toBe(500);
      expect(result.participant.participantOrder).toBe(1);
    }
  });

  it("rejects blank and duplicate participant names", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    expect(
      useApplicationStore.getState().addParticipant(session.id, {
        displayName: "   ",
        participationWeight: "full",
      }),
    ).toEqual({ ok: false, reason: "invalid-name" });

    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan Ridzuan",
      participationWeight: "full",
    });

    expect(
      useApplicationStore.getState().addParticipant(session.id, {
        displayName: "  JUAN   RIDZUAN ",
        participationWeight: "half",
      }),
    ).toEqual({ ok: false, reason: "duplicate-name" });
  });

  it("returns session-not-found when adding to an unknown session", () => {
    expect(
      useApplicationStore.getState().addParticipant("unknown", {
        displayName: "Juan",
        participationWeight: "full",
      }),
    ).toEqual({ ok: false, reason: "session-not-found" });
  });

  it("updates participant name and weight while preserving identity and order", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    const added = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    if (!added.ok) throw new Error("Expected participant creation to succeed.");

    vi.setSystemTime(new Date(updatedAt));
    const result = useApplicationStore.getState().updateParticipant(
      session.id,
      added.participant.id,
      { displayName: "  Juan Ridzuan ", participationWeight: "half" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.participant.id).toBe(firstParticipantId);
      expect(result.participant.displayName).toBe("Juan Ridzuan");
      expect(result.participant.defaultWeightUnits).toBe(500);
      expect(result.participant.participantOrder).toBe(0);
      expect(result.participant.createdAt).toBe(createdAt);
      expect(result.participant.updatedAt).toBe(updatedAt);
    }
  });

  it("rejects an update that duplicates another participant name", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    const first = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    const second = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Amir",
      participationWeight: "full",
    });
    if (!first.ok || !second.ok) throw new Error("Expected participant creation.");

    expect(
      useApplicationStore.getState().updateParticipant(
        session.id,
        second.participant.id,
        { displayName: " JUAN ", participationWeight: "half" },
      ),
    ).toEqual({ ok: false, reason: "duplicate-name" });
  });

  it("returns safe failures for unknown participant updates", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    expect(
      useApplicationStore.getState().updateParticipant(
        session.id,
        "unknown",
        { displayName: "Juan", participationWeight: "full" },
      ),
    ).toEqual({ ok: false, reason: "participant-not-found" });
  });

  it("removes only the selected participant and preserves remaining order", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    const first = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    const second = useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Amir",
      participationWeight: "half",
    });
    if (!first.ok || !second.ok) throw new Error("Expected participant creation.");

    expect(
      useApplicationStore.getState().removeParticipant(session.id, first.participant.id),
    ).toBe(true);

    const participants = useApplicationStore.getState().sessions[0]?.participants;
    expect(participants).toEqual([second.participant]);
    expect(participants?.[0]?.participantOrder).toBe(1);
  });

  it("returns false when removing an unknown participant or session", () => {
    const session = useApplicationStore.getState().createSession(validSessionValues());
    expect(
      useApplicationStore.getState().removeParticipant(session.id, "unknown"),
    ).toBe(false);
    expect(
      useApplicationStore.getState().removeParticipant("unknown", "unknown"),
    ).toBe(false);
  });
});
