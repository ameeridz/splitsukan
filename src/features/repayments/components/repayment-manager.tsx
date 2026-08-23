"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { calculateSessionBalances } from "../../balances/balance-model";
import { calculateSettlementTransfers } from "../../balances/settlement-model";
import {
  formatMoneyMinorUnits,
  parseMoneyInputToMinorUnits,
} from "../../expenses/expense-model";
import type {
  RepaymentId,
  RepaymentInput,
  SessionRepayment,
} from "../repayment-model";
import { useApplicationStore } from "../../../stores/application-store";

type RepaymentManagerProps = {
  sessionId: string;
};

type FormState = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
  note: string;
};

type ConfirmationState =
  | { type: "void"; repaymentId: RepaymentId }
  | { type: "delete"; repaymentId: RepaymentId }
  | null;

function createForm(repayment?: SessionRepayment): FormState {
  return {
    fromParticipantId: repayment?.fromParticipantId ?? "",
    toParticipantId: repayment?.toParticipantId ?? "",
    amount: repayment ? (repayment.amountMinor / 100).toFixed(2) : "",
    note: repayment?.note ?? "",
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(reason: string) {
  const messages: Record<string, string> = {
    "invalid-participant": "Choose valid participants for this repayment.",
    "same-participant": "Sender and recipient must be different participants.",
    "invalid-amount": "Enter a valid amount greater than RM0.00.",
    "no-outstanding-transfer": "No matching outstanding transfer is available.",
    "amount-exceeds-outstanding": "The repayment exceeds the outstanding amount.",
    "repayment-not-found": "This repayment is no longer available.",
  };

  return messages[reason] ?? "The repayment could not be saved. Please try again.";
}

export function RepaymentManager({ sessionId }: RepaymentManagerProps) {
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const addRepayment = useApplicationStore((state) => state.addRepayment);
  const updateRepayment = useApplicationStore((state) => state.updateRepayment);
  const voidRepayment = useApplicationStore((state) => state.voidRepayment);
  const deleteRepayment = useApplicationStore((state) => state.deleteRepayment);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRepaymentId, setEditingRepaymentId] =
    useState<RepaymentId | null>(null);
  const [expandedRepaymentId, setExpandedRepaymentId] =
    useState<RepaymentId | null>(null);
  const [confirmation, setConfirmation] =
    useState<ConfirmationState>(null);
  const [form, setForm] = useState<FormState>(() => createForm());
  const [error, setError] = useState<string | null>(null);

  const calculation = useMemo(() => {
    if (!session) return { balances: [], transfers: [] };
    const balances = calculateSessionBalances(session).balances;
    return {
      balances,
      transfers: calculateSettlementTransfers(balances),
    };
  }, [session]);

  if (!session) return null;

  const participantById = new Map(
    session.participants.map((participant) => [participant.id, participant]),
  );
  const selectedTransfer = calculation.transfers.find(
    (transfer) =>
      transfer.fromParticipantId === form.fromParticipantId &&
      transfer.toParticipantId === form.toParticipantId,
  );
  const completedRepayments = session.repayments.filter(
    (repayment) => repayment.status === "completed",
  );
  const completedTotalMinor = completedRepayments.reduce(
    (total, repayment) => total + repayment.amountMinor,
    0,
  );

  function openTransferForm(transfer: (typeof calculation.transfers)[number]) {
    setEditingRepaymentId(null);
    setForm({
      fromParticipantId: transfer.fromParticipantId,
      toParticipantId: transfer.toParticipantId,
      amount: (transfer.amountMinor / 100).toFixed(2),
      note: "",
    });
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(repayment: SessionRepayment) {
    setEditingRepaymentId(repayment.id);
    setForm(createForm(repayment));
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRepaymentId(null);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseMoneyInputToMinorUnits(form.amount);

    if (!form.fromParticipantId || !form.toParticipantId) {
      setError("Choose both the sender and recipient.");
      return;
    }
    if (!amountMinor) {
      setError("Enter a valid amount greater than RM0.00.");
      return;
    }

    const input: RepaymentInput = {
      fromParticipantId: form.fromParticipantId,
      toParticipantId: form.toParticipantId,
      amountMinor,
      note: form.note,
    };
    const result = editingRepaymentId
      ? updateRepayment(sessionId, editingRepaymentId, input)
      : addRepayment(sessionId, input);

    if (!result.ok) {
      setError(getErrorMessage(result.reason));
      return;
    }

    closeForm();
  }

  function confirmAction() {
    if (!confirmation) return;

    const succeeded =
      confirmation.type === "void"
        ? voidRepayment(sessionId, confirmation.repaymentId)
        : deleteRepayment(sessionId, confirmation.repaymentId);

    if (!succeeded) {
      setError("The repayment action could not be completed.");
    }
    setConfirmation(null);
  }

  const confirmationRepayment = confirmation
    ? session.repayments.find(
        (repayment) => repayment.id === confirmation.repaymentId,
      )
    : undefined;

  return (
    <section
      aria-labelledby="repayments-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div>
        <p className="text-sm font-semibold tracking-wide text-primary">
          REPAYMENTS
        </p>
        <h2 id="repayments-title" className="mt-2 text-xl font-bold tracking-tight">
          Record completed payments
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Record a full or partial payment from the current settlement suggestions.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
            Completed total
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {formatMoneyMinorUnits(completedTotalMinor)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
            Outstanding transfers
          </p>
          <p className="mt-2 text-2xl font-bold">{calculation.transfers.length}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold tracking-tight">Outstanding suggestions</h3>
        {calculation.transfers.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-success-surface p-4 text-success-foreground">
            <p className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 aria-hidden="true" size={18} /> Everyone is balanced
            </p>
            <p className="mt-1 text-xs opacity-80">
              No outstanding repayment needs to be recorded.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {calculation.transfers.map((transfer) => (
              <li
                key={`${transfer.fromParticipantId}:${transfer.toParticipantId}:${transfer.transferOrder}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <span className="truncate">
                      {participantById.get(transfer.fromParticipantId)?.displayName ??
                        "Unknown participant"}
                    </span>
                    <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {participantById.get(transfer.toParticipantId)?.displayName ??
                        "Unknown participant"}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {formatMoneyMinorUnits(transfer.amountMinor)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTransferForm(transfer)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  <Plus aria-hidden="true" size={15} /> Record payment
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold tracking-tight">Repayment history</h3>
        {session.repayments.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
            <ReceiptText aria-hidden="true" size={26} className="mx-auto text-primary" />
            <p className="mt-3 text-sm font-bold">No repayments recorded</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {session.repayments.map((repayment) => {
              const expanded = expandedRepaymentId === repayment.id;
              return (
                <li
                  key={repayment.id}
                  className="rounded-2xl border border-border bg-surface-muted p-4"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRepaymentId(expanded ? null : repayment.id)
                      }
                      className="min-w-0 flex-1 text-left"
                      aria-expanded={expanded}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                        <span className="truncate">
                          {participantById.get(repayment.fromParticipantId)?.displayName ??
                            "Unknown participant"}
                        </span>
                        <ArrowRight aria-hidden="true" size={15} className="shrink-0" />
                        <span className="truncate">
                          {participantById.get(repayment.toParticipantId)?.displayName ??
                            "Unknown participant"}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDateTime(repayment.completedAt)}
                      </span>
                    </button>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary">
                        {formatMoneyMinorUnits(repayment.amountMinor)}
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                        {repayment.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRepaymentId(expanded ? null : repayment.id)
                      }
                      aria-label={`${expanded ? "Hide" : "Show"} repayment details`}
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface"
                    >
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">
                        Note: {repayment.note ?? "No note"}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(repayment)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 text-xs font-semibold"
                        >
                          <Pencil aria-hidden="true" size={15} /> Edit
                        </button>
                        {repayment.status === "completed" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmation({
                                type: "void",
                                repaymentId: repayment.id,
                              })
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-warning/40 bg-warning-surface px-3 text-xs font-semibold text-warning-foreground"
                          >
                            <RotateCcw aria-hidden="true" size={15} /> Void
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmation({
                              type: "delete",
                              repaymentId: repayment.id,
                            })
                          }
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

      {isFormOpen ? (
        <div className="mt-6 rounded-2xl border border-border-strong bg-surface-muted p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold">
              {editingRepaymentId ? "Edit repayment" : "Record repayment"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close repayment form"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="repayment-from" className="text-sm font-bold">
                  From
                </label>
                <select
                  id="repayment-from"
                  value={form.fromParticipantId}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      fromParticipantId: event.target.value,
                    }));
                    setError(null);
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
                >
                  <option value="">Choose sender</option>
                  {session.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="repayment-to" className="text-sm font-bold">
                  To
                </label>
                <select
                  id="repayment-to"
                  value={form.toParticipantId}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      toParticipantId: event.target.value,
                    }));
                    setError(null);
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
                >
                  <option value="">Choose recipient</option>
                  {session.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="repayment-amount" className="text-sm font-bold">
                Amount (RM)
              </label>
              <div className="relative mt-2">
                <Banknote
                  aria-hidden="true"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="repayment-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }));
                    setError(null);
                  }}
                  placeholder="0.00"
                  className="min-h-11 w-full rounded-xl border border-border bg-input pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
                />
              </div>
              {selectedTransfer && !editingRepaymentId ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Outstanding: {formatMoneyMinorUnits(selectedTransfer.amountMinor)}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="repayment-note" className="text-sm font-bold">
                Note <span className="font-normal text-muted-foreground">Optional</span>
              </label>
              <input
                id="repayment-note"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Example: Paid via DuitNow"
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-focus-ring"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                {editingRepaymentId ? "Save Changes" : "Record Repayment"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmation && confirmationRepayment ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="repayment-confirmation-title"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)]"
          >
            <h3 id="repayment-confirmation-title" className="text-xl font-bold">
              {confirmation.type === "void" ? "Void" : "Delete"} repayment?
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {confirmation.type === "void"
                ? "The record remains in history but stops affecting outstanding balances."
                : "The repayment is permanently removed and outstanding balances are restored."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white"
              >
                {confirmation.type === "void" ? "Void Repayment" : "Delete Repayment"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
