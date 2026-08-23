"use client";

import {
  ArrowRight,
  CircleCheckBig,
  HandCoins,
  Scale,
  WalletCards,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import { formatMoneyMinorUnits } from "../../expenses/expense-model";
import { calculateSessionBalances } from "../balance-model";
import { calculateSettlementTransfers } from "../settlement-model";

type SessionBalanceSummaryProps = {
  sessionId: string;
};

function formatSignedMoney(amountMinor: number) {
  if (amountMinor > 0) {
    return `+${formatMoneyMinorUnits(amountMinor)}`;
  }

  if (amountMinor < 0) {
    return `-${formatMoneyMinorUnits(Math.abs(amountMinor))}`;
  }

  return formatMoneyMinorUnits(0);
}

export function SessionBalanceSummary({
  sessionId,
}: SessionBalanceSummaryProps) {
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );

  if (!session) {
    return null;
  }

  const participantById = new Map(
    session.participants.map((participant) => [participant.id, participant]),
  );
  const summary = calculateSessionBalances(session);
  const transfers = calculateSettlementTransfers(summary.balances);
  const hasActiveExpenses = summary.totalActiveExpenseAmountMinor > 0;
  const isBalanced = transfers.length === 0;

  return (
    <section
      aria-labelledby="balances-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div>
        <p className="text-sm font-semibold tracking-wide text-primary">
          BALANCES
        </p>
        <h2 id="balances-title" className="mt-2 text-xl font-bold tracking-tight">
          Who owes whom?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Balances are calculated from active expenses only. Void expenses are
          excluded automatically.
        </p>
      </div>

      {!hasActiveExpenses ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
          <Scale aria-hidden="true" size={28} className="mx-auto text-primary" />
          <h3 className="mt-3 font-bold tracking-tight">No active balances yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Add an active expense to calculate what each participant paid,
            owes, and should receive.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <WalletCards aria-hidden="true" size={16} /> Active total
              </p>
              <p className="mt-2 text-xl font-bold text-primary">
                {formatMoneyMinorUnits(summary.totalActiveExpenseAmountMinor)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <HandCoins aria-hidden="true" size={16} /> Transfers
              </p>
              <p className="mt-2 text-xl font-bold">{transfers.length}</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                <CircleCheckBig aria-hidden="true" size={16} /> Check
              </p>
              <p className="mt-2 text-sm font-bold text-success-foreground">
                Paid = Owed
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold tracking-tight">
              Participant balances
            </h3>
            <ul className="mt-3 space-y-3">
              {summary.balances.map((balance) => {
                const participant = participantById.get(balance.participantId);
                const positive = balance.netAmountMinor > 0;
                const negative = balance.netAmountMinor < 0;

                return (
                  <li
                    key={balance.participantId}
                    className="rounded-2xl border border-border bg-surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {participant?.displayName ?? "Unknown participant"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Paid {formatMoneyMinorUnits(balance.paidAmountMinor)} · Owes{" "}
                          {formatMoneyMinorUnits(balance.owedAmountMinor)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={[
                            "text-sm font-bold",
                            positive
                              ? "text-success-foreground"
                              : negative
                                ? "text-danger"
                                : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {formatSignedMoney(balance.netAmountMinor)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {positive
                            ? "receives"
                            : negative
                              ? "pays"
                              : "settled"}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold tracking-tight">Who pays whom</h3>

            {isBalanced ? (
              <div className="mt-3 rounded-2xl bg-success-surface p-4 text-success-foreground">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <CircleCheckBig aria-hidden="true" size={18} /> Everyone is balanced
                </p>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  No participant-to-participant payments are required.
                </p>
              </div>
            ) : (
              <ol className="mt-3 space-y-3">
                {transfers.map((transfer) => {
                  const fromParticipant = participantById.get(
                    transfer.fromParticipantId,
                  );
                  const toParticipant = participantById.get(
                    transfer.toParticipantId,
                  );

                  return (
                    <li
                      key={`${transfer.fromParticipantId}:${transfer.toParticipantId}:${transfer.transferOrder}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                        {transfer.transferOrder + 1}
                      </span>

                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                        <p className="truncate text-sm font-bold">
                          {fromParticipant?.displayName ?? "Unknown participant"}
                        </p>
                        <ArrowRight
                          aria-hidden="true"
                          size={17}
                          className="my-1 text-muted-foreground sm:my-0"
                        />
                        <p className="truncate text-sm font-bold">
                          {toParticipant?.displayName ?? "Unknown participant"}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-primary">
                        {formatMoneyMinorUnits(transfer.amountMinor)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
