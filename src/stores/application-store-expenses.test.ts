import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApplicationStore } from "./application-store";
import type { ExpenseInput } from "../features/expenses/expense-model";
import type { SessionFormValues } from "../features/sessions/session-form-model";

const ids = {
  session: "11111111-2222-4333-8444-555555555555",
  payer: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  second: "99999999-8888-4777-8666-555555555555",
  expense: "12345678-1234-4123-8123-123456789012",
};
const createdAt = "2026-08-23T04:00:00.000Z";
const updatedAt = "2026-08-23T05:00:00.000Z";

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

function expenseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    description: "Court rental",
    amountMinor: 7_500,
    paidByParticipantId: ids.payer,
    participants: [
      { participantId: ids.payer, weightUnits: 1_000 },
      { participantId: ids.second, weightUnits: 500 },
    ],
    ...overrides,
  };
}

describe("expense store actions", () => {
  beforeEach(() => {
    useApplicationStore.getState().resetStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(createdAt));
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce(ids.session)
      .mockReturnValueOnce(ids.payer)
      .mockReturnValueOnce(ids.second)
      .mockReturnValueOnce(ids.expense);

    const session = useApplicationStore.getState().createSession(sessionValues());
    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Juan",
      participationWeight: "full",
    });
    useApplicationStore.getState().addParticipant(session.id, {
      displayName: "Amir",
      participationWeight: "half",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useApplicationStore.getState().resetStore();
  });

  it("adds an expense with exact weighted allocations", () => {
    const result = useApplicationStore
      .getState()
      .addExpense(ids.session, expenseInput({ description: "  Court   rental  " }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expense.description).toBe("Court rental");
      expect(result.expense.status).toBe("active");
      expect(result.expense.allocations.map((item) => item.shareAmountMinor)).toEqual([
        5_000,
        2_500,
      ]);
      expect(
        result.expense.allocations.reduce(
          (total, item) => total + item.shareAmountMinor,
          0,
        ),
      ).toBe(7_500);
    }
  });

  it("rejects invalid description, amount, payer, and participants", () => {
    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({ description: "   " }),
      ),
    ).toEqual({ ok: false, reason: "invalid-description" });

    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({ amountMinor: 0 }),
      ),
    ).toEqual({ ok: false, reason: "invalid-amount" });

    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({ paidByParticipantId: "unknown" }),
      ),
    ).toEqual({ ok: false, reason: "invalid-payer" });

    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({ participants: [] }),
      ),
    ).toEqual({ ok: false, reason: "invalid-participants" });
  });

  it("rejects duplicate or unknown allocation participants", () => {
    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({
          participants: [
            { participantId: ids.payer, weightUnits: 1_000 },
            { participantId: ids.payer, weightUnits: 500 },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "duplicate-participant" });

    expect(
      useApplicationStore.getState().addExpense(
        ids.session,
        expenseInput({
          participants: [{ participantId: "unknown", weightUnits: 1_000 }],
        }),
      ),
    ).toEqual({ ok: false, reason: "invalid-participants" });
  });

  it("updates an expense while preserving identity and creation time", () => {
    const added = useApplicationStore.getState().addExpense(ids.session, expenseInput());
    if (!added.ok) throw new Error("Expected expense creation.");

    vi.setSystemTime(new Date(updatedAt));
    const result = useApplicationStore.getState().updateExpense(
      ids.session,
      added.expense.id,
      expenseInput({ amountMinor: 6_000, description: "Shuttlecocks" }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expense.id).toBe(ids.expense);
      expect(result.expense.createdAt).toBe(createdAt);
      expect(result.expense.updatedAt).toBe(updatedAt);
      expect(result.expense.description).toBe("Shuttlecocks");
      expect(result.expense.amountMinor).toBe(6_000);
      expect(result.expense.allocations.map((item) => item.shareAmountMinor)).toEqual([
        4_000,
        2_000,
      ]);
    }
  });

  it("returns safe failures for unknown sessions and expenses", () => {
    expect(
      useApplicationStore.getState().addExpense("unknown", expenseInput()),
    ).toEqual({ ok: false, reason: "session-not-found" });

    expect(
      useApplicationStore
        .getState()
        .updateExpense(ids.session, "unknown", expenseInput()),
    ).toEqual({ ok: false, reason: "expense-not-found" });
  });

  it("voids an active expense and updates the session timestamp", () => {
    const added = useApplicationStore.getState().addExpense(ids.session, expenseInput());
    if (!added.ok) throw new Error("Expected expense creation.");

    vi.setSystemTime(new Date(updatedAt));
    expect(
      useApplicationStore.getState().voidExpense(ids.session, added.expense.id),
    ).toBe(true);

    const session = useApplicationStore.getState().sessions[0];
    expect(session?.expenses[0]?.status).toBe("void");
    expect(session?.expenses[0]?.updatedAt).toBe(updatedAt);
    expect(session?.updatedAt).toBe(updatedAt);
    expect(
      useApplicationStore.getState().voidExpense(ids.session, added.expense.id),
    ).toBe(false);
  });

  it("deletes only the selected expense", () => {
    const added = useApplicationStore.getState().addExpense(ids.session, expenseInput());
    if (!added.ok) throw new Error("Expected expense creation.");

    expect(
      useApplicationStore.getState().deleteExpense(ids.session, added.expense.id),
    ).toBe(true);
    expect(useApplicationStore.getState().sessions[0]?.expenses).toEqual([]);
    expect(
      useApplicationStore.getState().deleteExpense(ids.session, added.expense.id),
    ).toBe(false);
  });
});
