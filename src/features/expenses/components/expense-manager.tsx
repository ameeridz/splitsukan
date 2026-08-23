"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Undo2,
  UsersRound,
  X,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import { calculateExpenseAllocations } from "../expense-allocation";
import {
  formatMoneyMinorUnits,
  parseMoneyInputToMinorUnits,
  type ExpenseId,
  type ExpenseInput,
  type SessionExpense,
} from "../expense-model";

type ExpenseManagerProps = { sessionId: string };
type ParticipantSelection = { selected: boolean; weightUnits: number };
type ExpenseFormState = {
  description: string;
  amount: string;
  paidByParticipantId: string;
  participantSelections: Record<string, ParticipantSelection>;
};

type ConfirmationState =
  | { type: "void"; expenseId: ExpenseId }
  | { type: "delete"; expenseId: ExpenseId }
  | null;

function createForm(
  participants: Array<{ id: string; defaultWeightUnits: number }>,
  expense?: SessionExpense,
): ExpenseFormState {
  const allocationByParticipant = new Map(
    expense?.allocations.map((allocation) => [allocation.participantId, allocation]),
  );

  return {
    description: expense?.description ?? "",
    amount: expense ? (expense.amountMinor / 100).toFixed(2) : "",
    paidByParticipantId: expense?.paidByParticipantId ?? participants[0]?.id ?? "",
    participantSelections: Object.fromEntries(
      participants.map((participant) => {
        const allocation = allocationByParticipant.get(participant.id);
        return [
          participant.id,
          {
            selected: Boolean(allocation) || !expense,
            weightUnits: allocation?.weightUnits ?? participant.defaultWeightUnits,
          },
        ];
      }),
    ),
  };
}

function getErrorMessage(reason: string) {
  const messages: Record<string, string> = {
    "invalid-description": "Enter an expense description.",
    "invalid-amount": "Enter a valid amount greater than RM0.00.",
    "invalid-payer": "Choose an active participant as the payer.",
    "invalid-participants": "Select at least one participant.",
    "duplicate-participant": "A participant was selected more than once.",
    "expense-not-found": "This expense is no longer available.",
  };
  return messages[reason] ?? "The expense could not be saved. Please try again.";
}

export function ExpenseManager({ sessionId }: ExpenseManagerProps) {
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const addExpense = useApplicationStore((state) => state.addExpense);
  const updateExpense = useApplicationStore((state) => state.updateExpense);
  const voidExpense = useApplicationStore((state) => state.voidExpense);
  const deleteExpense = useApplicationStore((state) => state.deleteExpense);

  const activeParticipants = useMemo(
    () =>
      [...(session?.participants ?? [])]
        .filter((participant) => participant.isActive)
        .sort((a, b) => a.participantOrder - b.participantOrder),
    [session?.participants],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<ExpenseId | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<ExpenseId | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [form, setForm] = useState<ExpenseFormState>(() => createForm([]));
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const participantById = new Map(
    session.participants.map((participant) => [participant.id, participant]),
  );
  const amountMinor = parseMoneyInputToMinorUnits(form.amount);
  const selectedParticipants = activeParticipants
    .filter((participant) => form.participantSelections[participant.id]?.selected)
    .map((participant) => ({
      participantId: participant.id,
      weightUnits:
        form.participantSelections[participant.id]?.weightUnits ??
        participant.defaultWeightUnits,
    }));

  let previewAllocations: ReturnType<typeof calculateExpenseAllocations> = [];
  if (amountMinor && selectedParticipants.length > 0) {
    try {
      previewAllocations = calculateExpenseAllocations({
        expenseId: editingExpenseId ?? "expense-preview",
        amountMinor,
        participants: selectedParticipants,
      });
    } catch {
      previewAllocations = [];
    }
  }

  const activeExpenses = session.expenses.filter((expense) => expense.status === "active");
  const totalActiveAmount = activeExpenses.reduce(
    (total, expense) => total + expense.amountMinor,
    0,
  );

  function openCreateForm() {
    setEditingExpenseId(null);
    setForm(createForm(activeParticipants));
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(expense: SessionExpense) {
    setEditingExpenseId(expense.id);
    setForm(createForm(activeParticipants, expense));
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingExpenseId(null);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInputToMinorUnits(form.amount);

    if (!form.description.trim()) return setError("Enter an expense description.");
    if (!parsedAmount) return setError("Enter a valid amount greater than RM0.00.");
    if (!form.paidByParticipantId) return setError("Choose who paid for this expense.");
    if (selectedParticipants.length === 0) return setError("Select at least one participant.");

    const input: ExpenseInput = {
      description: form.description,
      amountMinor: parsedAmount,
      paidByParticipantId: form.paidByParticipantId,
      participants: selectedParticipants,
    };
    const result = editingExpenseId
      ? updateExpense(sessionId, editingExpenseId, input)
      : addExpense(sessionId, input);

    if (!result.ok) return setError(getErrorMessage(result.reason));
    closeForm();
  }

  function confirmAction() {
    if (!confirmation) return;
    const succeeded =
      confirmation.type === "void"
        ? voidExpense(sessionId, confirmation.expenseId)
        : deleteExpense(sessionId, confirmation.expenseId);

    if (!succeeded) setError("The expense action could not be completed.");
    setConfirmation(null);
  }

  const confirmationExpense = confirmation
    ? session.expenses.find((expense) => expense.id === confirmation.expenseId)
    : undefined;

  return (
    <section
      aria-labelledby="expenses-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-primary">EXPENSES</p>
          <h2 id="expenses-title" className="mt-2 text-xl font-bold tracking-tight">
            Shared session costs
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Record who paid and review every participant share.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          disabled={activeParticipants.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          <Plus aria-hidden="true" size={18} /> Add Expense
        </button>
      </div>

      {activeParticipants.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
          <UsersRound aria-hidden="true" size={28} className="mx-auto text-primary" />
          <h3 className="mt-3 font-bold">Add participants first</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            At least one active participant is required before recording an expense.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-info-surface p-4 text-info-foreground">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Active expense total
            </p>
            <p className="mt-1 text-2xl font-bold">{formatMoneyMinorUnits(totalActiveAmount)}</p>
            <p className="mt-1 text-xs opacity-80">
              {activeExpenses.length} active {activeExpenses.length === 1 ? "expense" : "expenses"}
            </p>
          </div>

          {session.expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
              <ReceiptText aria-hidden="true" size={28} className="mx-auto text-primary" />
              <h3 className="mt-3 font-bold">No expenses yet</h3>
            </div>
          ) : (
            <ul className="space-y-3">
              {session.expenses.map((expense) => {
                const payer = participantById.get(expense.paidByParticipantId);
                const expanded = expandedExpenseId === expense.id;

                return (
                  <li
                    key={expense.id}
                    className="rounded-2xl border border-border bg-surface-muted p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                        <ReceiptText aria-hidden="true" size={19} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedExpenseId(expanded ? null : expense.id)}
                        aria-expanded={expanded}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-bold">
                          {expense.description}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Paid by {payer?.displayName ?? "Unknown participant"} · {expense.allocations.length}{" "}
                          {expense.allocations.length === 1 ? "share" : "shares"}
                        </span>
                      </button>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-primary">
                          {formatMoneyMinorUnits(expense.amountMinor)}
                        </p>
                        <span
                          className={[
                            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            expense.status === "active"
                              ? "bg-success-surface text-success-foreground"
                              : "bg-surface text-muted-foreground",
                          ].join(" ")}
                        >
                          {expense.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedExpenseId(expanded ? null : expense.id)}
                        aria-label={`${expanded ? "Hide" : "Show"} ${expense.description} details`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface"
                      >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <ul className="space-y-2">
                          {expense.allocations.map((allocation) => {
                            const participant = participantById.get(allocation.participantId);
                            return (
                              <li
                                key={allocation.id}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="min-w-0 truncate text-muted-foreground">
                                  {participant?.displayName ?? "Unknown participant"}{" "}
                                  <span className="text-xs">
                                    ({allocation.weightUnits === 500 ? "Half" : "Full"})
                                  </span>
                                </span>
                                <span className="shrink-0 font-semibold">
                                  {formatMoneyMinorUnits(allocation.shareAmountMinor)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(expense)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 text-xs font-semibold hover:bg-surface-muted"
                          >
                            <Pencil aria-hidden="true" size={15} /> Edit
                          </button>
                          {expense.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => setConfirmation({ type: "void", expenseId: expense.id })}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-warning/40 bg-warning-surface px-3 text-xs font-semibold text-warning-foreground"
                            >
                              <Undo2 aria-hidden="true" size={15} /> Void
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setConfirmation({ type: "delete", expenseId: expense.id })}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-danger/40 bg-danger-surface px-3 text-xs font-semibold text-danger-foreground"
                          >
                            <Trash2 aria-hidden="true" size={15} /> Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {isFormOpen ? (
        <div className="mt-6 rounded-2xl border border-border-strong bg-surface-muted p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold">{editingExpenseId ? "Edit expense" : "Add expense"}</h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close expense form"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="expense-description" className="text-sm font-bold">Description</label>
                <input
                  id="expense-description"
                  value={form.description}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, description: event.target.value }));
                    setError(null);
                  }}
                  autoFocus
                  placeholder="Example: Court rental"
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
                />
              </div>
              <div>
                <label htmlFor="expense-amount" className="text-sm font-bold">Amount (RM)</label>
                <div className="relative mt-2">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    id="expense-amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, amount: event.target.value }));
                      setError(null);
                    }}
                    placeholder="0.00"
                    className="min-h-11 w-full rounded-xl border border-border bg-input pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="expense-payer" className="text-sm font-bold">Paid by</label>
              <select
                id="expense-payer"
                value={form.paidByParticipantId}
                onChange={(event) => setForm((current) => ({ ...current, paidByParticipantId: event.target.value }))}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
              >
                {activeParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>{participant.displayName}</option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-bold">Split between</legend>
              <div className="mt-3 space-y-3">
                {activeParticipants.map((participant) => {
                  const selection = form.participantSelections[participant.id];
                  const selected = selection?.selected ?? false;
                  const preview = previewAllocations.find(
                    (allocation) => allocation.participantId === participant.id,
                  );

                  return (
                    <div key={participant.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            participantSelections: {
                              ...current.participantSelections,
                              [participant.id]: {
                                selected: !selected,
                                weightUnits: selection?.weightUnits ?? participant.defaultWeightUnits,
                              },
                            },
                          }))
                        }
                        aria-pressed={selected}
                        className={[
                          "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border-strong text-muted-foreground",
                        ].join(" ")}
                      >
                        {selected ? <Check aria-hidden="true" size={18} /> : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{participant.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {selected ? `Preview: ${formatMoneyMinorUnits(preview?.shareAmountMinor ?? 0)}` : "Not included"}
                        </p>
                      </div>
                      <div className="flex shrink-0 rounded-xl border border-border bg-surface-muted p-1">
                        {[1_000, 500].map((weightUnits) => (
                          <button
                            key={weightUnits}
                            type="button"
                            disabled={!selected}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                participantSelections: {
                                  ...current.participantSelections,
                                  [participant.id]: { selected: true, weightUnits },
                                },
                              }))
                            }
                            className={[
                              "min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-40",
                              selected && selection?.weightUnits === weightUnits
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {weightUnits === 1_000 ? "Full" : "Half"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground">{error}</p>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Allocation preview</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedParticipants.length} participants</p>
              </div>
              <p className="text-xl font-bold text-primary">{formatMoneyMinorUnits(amountMinor ?? 0)}</p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeForm} className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold">Cancel</button>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                <CircleDollarSign aria-hidden="true" size={18} />
                {editingExpenseId ? "Save Changes" : "Create Expense"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmationExpense && confirmation ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="expense-confirmation-title"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)]"
          >
            <h3 id="expense-confirmation-title" className="text-xl font-bold">
              {confirmation.type === "void" ? "Void" : "Delete"} “{confirmationExpense.description}”?
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {confirmation.type === "void"
                ? "The expense remains visible but is removed from active totals."
                : "The expense is permanently removed from this session."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmation(null)} className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={confirmAction} className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white">
                {confirmation.type === "void" ? "Void Expense" : "Delete Expense"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
