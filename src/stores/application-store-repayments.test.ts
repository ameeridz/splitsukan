import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { calculateSessionBalances } from "../features/balances/balance-model";
import type { SessionFormValues } from "../features/sessions/session-form-model";
import { useApplicationStore } from "./application-store";

const ids = {
  session: "11111111-2222-4333-8444-555555555555",
  juan: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  amir: "99999999-8888-4777-8666-555555555555",
  expense: "12345678-1234-4123-8123-123456789012",
  repayment: "87654321-4321-4321-8321-210987654321",
};
const createdAt = "2026-08-23T05:00:00.000Z";
const updatedAt = "2026-08-23T06:00:00.000Z";

function sessionValues(): SessionFormValues {
  return {
    activityType: "badminton",
    customActivityName: "",
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: "",
  };
}

function repaymentInput(amountMinor = 2_000) {
  return {
    fromParticipantId: ids.amir,
    toParticipantId: ids.juan,
    amountMinor,
    note: "  Paid   via DuitNow  ",
  };
}

describe("repayment store actions", () => {
  beforeEach(() => {
    useApplicationStore.getState().resetStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(createdAt));
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(ids.session)
      .mockReturnValueOnce(ids.juan)
      .mockReturnValueOnce(ids.amir)
      .mockReturnValueOnce(ids.expense)
      .mockReturnValueOnce(ids.repayment);

    const session = useApplicationStore.getState().createSession(sessionValues());
    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Amir",
      participationWeight: "full",
    });
    useApplicationStore.getState().addExpense(session.id, {
      description: "Court rental",
      amountMinor: 10_000,
      paidByParticipantId: ids.juan,
      participants: [
        { participantId: ids.juan, weightUnits: 1_000 },
        { participantId: ids.amir, weightUnits: 1_000 },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useApplicationStore.getState().resetStore();
  });

  it("adds a completed partial repayment and normalizes its note", () => {
    const result = useApplicationStore
      .getState()
      .addRepayment(ids.session, repaymentInput());

    expect(result).toEqual({
      ok: true,
      repayment: {
        id: ids.repayment,
        fromParticipantId: ids.amir,
        toParticipantId: ids.juan,
        amountMinor: 2_000,
        note: "Paid via DuitNow",
        status: "completed",
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const summary = calculateSessionBalances(
      useApplicationStore.getState().sessions[0]!,
    );
    expect(summary.balances.map((item) => item.netAmountMinor)).toEqual([
      3_000,
      -3_000,
    ]);
  });

  it("allows an exact repayment that fully settles the transfer", () => {
    const result = useApplicationStore
      .getState()
      .addRepayment(ids.session, repaymentInput(5_000));

    expect(result.ok).toBe(true);
    expect(
      calculateSessionBalances(
        useApplicationStore.getState().sessions[0]!,
      ).balances.map((item) => item.netAmountMinor),
    ).toEqual([0, 0]);
  });

  it("rejects overpayment and unrelated transfers", () => {
    expect(
      useApplicationStore
        .getState()
        .addRepayment(ids.session, repaymentInput(5_001)),
    ).toEqual({ ok: false, reason: "amount-exceeds-outstanding" });

    expect(
      useApplicationStore.getState().addRepayment(ids.session, {
        ...repaymentInput(100),
        fromParticipantId: ids.juan,
        toParticipantId: ids.amir,
      }),
    ).toEqual({ ok: false, reason: "no-outstanding-transfer" });
  });

  it("rejects invalid participants, same participant, and invalid amounts", () => {
    expect(
      useApplicationStore.getState().addRepayment(ids.session, {
        ...repaymentInput(),
        fromParticipantId: "unknown",
      }),
    ).toEqual({ ok: false, reason: "invalid-participant" });

    expect(
      useApplicationStore.getState().addRepayment(ids.session, {
        ...repaymentInput(),
        fromParticipantId: ids.juan,
        toParticipantId: ids.juan,
      }),
    ).toEqual({ ok: false, reason: "same-participant" });

    expect(
      useApplicationStore
        .getState()
        .addRepayment(ids.session, repaymentInput(0)),
    ).toEqual({ ok: false, reason: "invalid-amount" });
  });

  it("updates a repayment using the outstanding amount before that repayment", () => {
    const added = useApplicationStore
      .getState()
      .addRepayment(ids.session, repaymentInput(2_000));
    if (!added.ok) throw new Error("Expected repayment creation.");

    vi.setSystemTime(new Date(updatedAt));
    const result = useApplicationStore.getState().updateRepayment(
      ids.session,
      added.repayment.id,
      repaymentInput(3_000),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.repayment.id).toBe(ids.repayment);
      expect(result.repayment.createdAt).toBe(createdAt);
      expect(result.repayment.completedAt).toBe(updatedAt);
      expect(result.repayment.updatedAt).toBe(updatedAt);
      expect(result.repayment.amountMinor).toBe(3_000);
    }

    expect(
      calculateSessionBalances(
        useApplicationStore.getState().sessions[0]!,
      ).balances.map((item) => item.netAmountMinor),
    ).toEqual([2_000, -2_000]);
  });

  it("voids a repayment and restores its outstanding balance", () => {
    const added = useApplicationStore
      .getState()
      .addRepayment(ids.session, repaymentInput(2_000));
    if (!added.ok) throw new Error("Expected repayment creation.");

    expect(
      useApplicationStore
        .getState()
        .voidRepayment(ids.session, added.repayment.id),
    ).toBe(true);
    expect(
      calculateSessionBalances(
        useApplicationStore.getState().sessions[0]!,
      ).balances.map((item) => item.netAmountMinor),
    ).toEqual([5_000, -5_000]);
    expect(
      useApplicationStore
        .getState()
        .voidRepayment(ids.session, added.repayment.id),
    ).toBe(false);
  });

  it("deletes a repayment and restores its outstanding balance", () => {
    const added = useApplicationStore
      .getState()
      .addRepayment(ids.session, repaymentInput(2_000));
    if (!added.ok) throw new Error("Expected repayment creation.");

    expect(
      useApplicationStore
        .getState()
        .deleteRepayment(ids.session, added.repayment.id),
    ).toBe(true);
    expect(useApplicationStore.getState().sessions[0]?.repayments).toEqual([]);
    expect(
      calculateSessionBalances(
        useApplicationStore.getState().sessions[0]!,
      ).balances.map((item) => item.netAmountMinor),
    ).toEqual([5_000, -5_000]);
  });

  it("returns safe failures for unknown sessions and repayments", () => {
    expect(
      useApplicationStore.getState().addRepayment("unknown", repaymentInput()),
    ).toEqual({ ok: false, reason: "session-not-found" });

    expect(
      useApplicationStore
        .getState()
        .updateRepayment(ids.session, "unknown", repaymentInput()),
    ).toEqual({ ok: false, reason: "repayment-not-found" });
    expect(
      useApplicationStore
        .getState()
        .voidRepayment(ids.session, "unknown"),
    ).toBe(false);
    expect(
      useApplicationStore
        .getState()
        .deleteRepayment(ids.session, "unknown"),
    ).toBe(false);
  });
});
