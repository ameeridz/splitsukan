"use client";

import { ReceiptText, WalletCards } from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import { formatMoneyMinorUnits } from "../expense-model";

type SessionExpenseSummaryProps = {
  sessionId: string;
};

export function SessionExpenseSummary({
  sessionId,
}: SessionExpenseSummaryProps) {
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );

  if (!session) {
    return null;
  }

  const activeExpenses = session.expenses.filter(
    (expense) => expense.status === "active",
  );
  const activeExpenseTotalMinor = activeExpenses.reduce(
    (total, expense) => total + expense.amountMinor,
    0,
  );

  return (
    <section
      aria-label="Session expense summary"
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="rounded-2xl border border-border bg-surface-muted p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          <WalletCards aria-hidden="true" size={17} />
          Active expense total
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
          {formatMoneyMinorUnits(activeExpenseTotalMinor)}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-muted p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          <ReceiptText aria-hidden="true" size={17} />
          Expense records
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">
          {activeExpenses.length}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {activeExpenses.length === 1 ? "active expense" : "active expenses"}
        </p>
      </div>
    </section>
  );
}
