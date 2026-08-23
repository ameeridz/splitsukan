"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  MapPin,
  Plus,
  Search,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { calculateSessionBalances } from "../../balances/balance-model";
import { calculateSettlementTransfers } from "../../balances/settlement-model";
import { formatMoneyMinorUnits } from "../../expenses/expense-model";
import { formatSessionDate } from "../../sessions/session-date-format";
import {
  getSessionActivityName,
  type SessionRecord,
} from "../../sessions/session-model";
import { useApplicationStore } from "../../../stores/application-store";

type ReportFilter = "all" | "outstanding" | "settled";

const reportFilters: Array<{ value: ReportFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "settled", label: "Settled" },
];

function sortSessions(sessions: SessionRecord[]) {
  return [...sessions].sort((first, second) => {
    const firstSchedule = `${first.date}T${first.startTime}`;
    const secondSchedule = `${second.date}T${second.startTime}`;

    return secondSchedule.localeCompare(firstSchedule);
  });
}

function getReportMetrics(session: SessionRecord) {
  const activeParticipantCount = session.participants.filter(
    (participant) => participant.isActive,
  ).length;
  const activeExpenses = session.expenses.filter(
    (expense) => expense.status === "active",
  );
  const activeExpenseTotalMinor = activeExpenses.reduce(
    (total, expense) => total + expense.amountMinor,
    0,
  );
  const balanceSummary = calculateSessionBalances(session);
  const outstandingTransfers = calculateSettlementTransfers(
    balanceSummary.balances,
  );

  return {
    activeParticipantCount,
    activeExpenseCount: activeExpenses.length,
    activeExpenseTotalMinor,
    outstandingTransferCount: outstandingTransfers.length,
    hasFinancialActivity:
      session.expenses.length > 0 || session.repayments.length > 0,
  };
}

function ReportSessionCard({ session }: { session: SessionRecord }) {
  const metrics = getReportMetrics(session);

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight">
            {getSessionActivityName(session)}
          </h3>
          <p className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground">
            <MapPin aria-hidden="true" size={16} className="shrink-0" />
            <span className="truncate">{session.venue}</span>
          </p>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize",
            session.status === "settled"
              ? "bg-success-surface text-success-foreground"
              : session.status === "active"
                ? "bg-info-surface text-info-foreground"
                : "bg-warning-surface text-warning-foreground",
          ].join(" ")}
        >
          {session.status}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays aria-hidden="true" size={17} />
          <dt className="sr-only">Date</dt>
          <dd>{formatSessionDate(session.date)}</dd>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <UsersRound aria-hidden="true" size={17} />
          <dt className="sr-only">Participants</dt>
          <dd>
            {metrics.activeParticipantCount}{" "}
            {metrics.activeParticipantCount === 1
              ? "participant"
              : "participants"}
          </dd>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
          <WalletCards aria-hidden="true" size={17} />
          <dt className="sr-only">Active expense total</dt>
          <dd>
            <span className="font-semibold text-foreground">
              {formatMoneyMinorUnits(metrics.activeExpenseTotalMinor)}
            </span>{" "}
            · {metrics.activeExpenseCount}{" "}
            {metrics.activeExpenseCount === 1
              ? "active expense"
              : "active expenses"}
          </dd>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
          <FileText aria-hidden="true" size={17} />
          <dt className="sr-only">Outstanding transfers</dt>
          <dd>
            {metrics.outstandingTransferCount}{" "}
            {metrics.outstandingTransferCount === 1
              ? "outstanding transfer"
              : "outstanding transfers"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        {metrics.hasFinancialActivity ? (
          <Link
            href={`/reports/${session.id}`}
            className={[
              "group inline-flex min-h-11 w-full items-center justify-between",
              "rounded-xl bg-primary px-4 text-sm font-semibold",
              "text-primary-foreground transition-colors hover:bg-primary-hover",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-surface",
            ].join(" ")}
          >
            <span>View Report</span>
            <ArrowRight
              aria-hidden="true"
              size={18}
              className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        ) : (
          <div className="rounded-xl bg-surface-muted px-4 py-3 text-center text-xs font-medium text-muted-foreground">
            No financial activity to report yet.
          </div>
        )}
      </div>
    </article>
  );
}

export function ReportsOverview() {
  const sessions = useApplicationStore((state) => state.sessions);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReportFilter>("all");

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-MY");

    return sortSessions(sessions).filter((session) => {
      const metrics = getReportMetrics(session);
      const matchesSearch =
        !normalizedQuery ||
        getSessionActivityName(session)
          .toLocaleLowerCase("en-MY")
          .includes(normalizedQuery) ||
        session.venue.toLocaleLowerCase("en-MY").includes(normalizedQuery) ||
        session.date.includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "settled" && session.status === "settled") ||
        (filter === "outstanding" &&
          metrics.outstandingTransferCount > 0);

      return matchesSearch && matchesFilter;
    });
  }, [filter, query, sessions]);

  if (!hasHydrated) {
    return (
      <div role="status" className="space-y-4">
        <div className="h-12 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
        <span className="sr-only">Restoring report sessions...</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border-strong bg-surface p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <FileText aria-hidden="true" size={27} strokeWidth={2.2} />
        </span>
        <h2 className="mt-5 text-xl font-bold tracking-tight">
          No sessions available for reports
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Reports are generated from sessions saved in this browser. Create a
          session first, then return here to preview and share its summary.
        </p>
        <Link
          href="/sessions/new"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus aria-hidden="true" size={19} />
          New Session
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold tracking-wide text-primary">
          REPORTS
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">
          Choose a session report
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Preview financial activity from sessions stored in this browser.
          Download and native sharing will be added to each report preview.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="report-search" className="text-sm font-bold">
              Search sessions
            </label>
            <div className="relative mt-2">
              <Search
                aria-hidden="true"
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="report-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Activity, venue, or date"
                className="min-h-11 w-full rounded-xl border border-border bg-input pl-10 pr-3 text-sm outline-none placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-bold">Filter</p>
            <div
              role="group"
              aria-label="Filter report sessions"
              className="mt-2 flex rounded-xl border border-border bg-surface-muted p-1"
            >
              {reportFilters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  aria-pressed={filter === option.value}
                  className={[
                    "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors",
                    filter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="report-sessions-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="report-sessions-title" className="text-xl font-bold tracking-tight">
              Report sessions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredSessions.length} of {sessions.length}{" "}
              {sessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
            <Search aria-hidden="true" size={26} className="mx-auto text-primary" />
            <h3 className="mt-3 font-bold tracking-tight">No matching reports</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another search term or report filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {filteredSessions.map((session) => (
              <ReportSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
