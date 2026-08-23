"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  FileText,
  MapPin,
  ReceiptText,
  Share2,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { formatMoneyMinorUnits } from "../../expenses/expense-model";
import { getParticipationWeightLabel } from "../../participants/participant-model";
import { formatSessionDate } from "../../sessions/session-date-format";
import { useApplicationStore } from "../../../stores/application-store";
import {
  createSessionReportFileName,
  generateSessionReportPdfBlob,
} from "../report-pdf-generator";
import { createSessionReportSnapshot } from "../report-snapshot-model";

type SessionReportPreviewProps = {
  sessionId: string;
};

function formatSessionTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return startTime;
  }

  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
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

function formatSignedMoney(amountMinor: number) {
  if (amountMinor > 0) return `+${formatMoneyMinorUnits(amountMinor)}`;
  if (amountMinor < 0) {
    return `-${formatMoneyMinorUnits(Math.abs(amountMinor))}`;
  }
  return formatMoneyMinorUnits(0);
}

export function SessionReportPreview({
  sessionId,
}: SessionReportPreviewProps) {
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  if (!hasHydrated) {
    return (
      <div role="status" className="space-y-4">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-surface" />
        <span className="sr-only">Preparing session report...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="rounded-3xl border border-danger/40 bg-danger-surface p-6 text-danger-foreground shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Report session not found</h2>
        <p className="mt-2 text-sm leading-6 opacity-85">
          This session is not stored in the current browser, or its local data
          has been cleared.
        </p>
        <Link
          href="/reports"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-foreground"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Reports
        </Link>
      </section>
    );
  }

  const snapshot = createSessionReportSnapshot({
    session,
    generatedAt: new Date().toISOString(),
  });

  function downloadPdfBlob(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }

  async function createFreshPdfFile() {
    if (!session) return null;

    const freshSnapshot = createSessionReportSnapshot({
      session,
      generatedAt: new Date().toISOString(),
    });
    const blob = await generateSessionReportPdfBlob(freshSnapshot);
    const fileName = createSessionReportFileName(freshSnapshot);

    return {
      blob,
      fileName,
      file: new File([blob], fileName, { type: "application/pdf" }),
      snapshot: freshSnapshot,
    };
  }

  async function handleDownloadPdf() {
    if (isGeneratingPdf || isSharingPdf) return;
    if (!session) return;

    setIsGeneratingPdf(true);
    setPdfError(null);
    setShareNotice(null);

    try {
      const generated = await createFreshPdfFile();
      if (!generated) return;

      downloadPdfBlob(generated.blob, generated.fileName);
    } catch (error) {
      console.error("Unable to generate the SplitSukan PDF report.", error);
      setPdfError(
        "The PDF could not be generated. Please try again on this device.",
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function handleSharePdf() {
    if (isGeneratingPdf || isSharingPdf) return;
    if (!session) return;

    setIsSharingPdf(true);
    setPdfError(null);
    setShareNotice(null);

    try {
      const generated = await createFreshPdfFile();
      if (!generated) return;

      const shareData = {
        title: `SplitSukan - ${generated.snapshot.session.activityName}`,
        text: `SplitSukan session report for ${generated.snapshot.session.activityName}.`,
        files: [generated.file],
      };
      const canShareFile =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [generated.file] });

      if (canShareFile) {
        await navigator.share(shareData);
        return;
      }

      downloadPdfBlob(generated.blob, generated.fileName);
      setShareNotice(
        "File sharing is not supported in this browser, so the PDF was downloaded instead.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      console.error("Unable to share the SplitSukan PDF report.", error);
      setPdfError(
        "The report could not be shared. Please download the PDF and share it manually.",
      );
    } finally {
      setIsSharingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/reports"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Reports
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isSharingPdf}
            className={[
              "inline-flex min-h-11 items-center gap-2 rounded-xl",
              "border border-border-strong bg-surface px-4 text-sm font-semibold",
              "text-foreground transition-colors hover:bg-surface-muted",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background disabled:cursor-wait",
              "disabled:opacity-60",
            ].join(" ")}
          >
            <FileDown aria-hidden="true" size={18} />
            {isGeneratingPdf ? "Generating..." : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={handleSharePdf}
            disabled={isGeneratingPdf || isSharingPdf}
            className={[
              "inline-flex min-h-11 items-center gap-2 rounded-xl",
              "bg-primary px-4 text-sm font-semibold text-primary-foreground",
              "transition-colors hover:bg-primary-hover",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-focus-ring focus-visible:ring-offset-2",
              "focus-visible:ring-offset-background disabled:cursor-wait",
              "disabled:opacity-60",
            ].join(" ")}
          >
            <Share2 aria-hidden="true" size={18} />
            {isSharingPdf ? "Preparing..." : "Share"}
          </button>
        </div>
      </div>

      {pdfError ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-surface p-3 text-sm font-medium text-danger-foreground"
        >
          {pdfError}
        </p>
      ) : null}

      {shareNotice ? (
        <p
          role="status"
          className="rounded-xl bg-info-surface p-3 text-sm font-medium text-info-foreground"
        >
          {shareNotice}
        </p>
      ) : null}

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">
              SPLITSUKAN SESSION REPORT
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {snapshot.session.activityName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generated {formatDateTime(snapshot.generatedAt)}
            </p>
          </div>
          <span
            className={[
              "w-fit rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
              snapshot.reportState === "settled"
                ? "bg-success-surface text-success-foreground"
                : snapshot.reportState === "outstanding"
                  ? "bg-info-surface text-info-foreground"
                  : "bg-warning-surface text-warning-foreground",
            ].join(" ")}
          >
            {snapshot.reportState}
          </span>
        </div>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <CalendarDays aria-hidden="true" size={17} /> Date
            </dt>
            <dd className="mt-2 font-semibold">
              {formatSessionDate(snapshot.session.date)}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <Clock3 aria-hidden="true" size={17} /> Time
            </dt>
            <dd className="mt-2 font-semibold">
              {formatSessionTime(snapshot.session.startTime)}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              <MapPin aria-hidden="true" size={17} /> Venue
            </dt>
            <dd className="mt-2 wrap-break-word font-semibold">
              {snapshot.session.venue}
            </dd>
          </div>
          {snapshot.session.note ? (
            <div className="rounded-2xl border border-border bg-surface-muted p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                Note
              </dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {snapshot.session.note}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <UsersRound aria-hidden="true" size={19} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">{snapshot.totals.participantCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">participants</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <WalletCards aria-hidden="true" size={19} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">
            {formatMoneyMinorUnits(snapshot.totals.activeExpenseAmountMinor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">active expenses</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <ReceiptText aria-hidden="true" size={19} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">
            {formatMoneyMinorUnits(snapshot.totals.completedRepaymentAmountMinor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">completed repayments</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <FileText aria-hidden="true" size={19} className="text-primary" />
          <p className="mt-3 text-2xl font-bold">
            {snapshot.totals.outstandingTransferCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">outstanding transfers</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight">Participants</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-4"
            >
              <span className="min-w-0 truncate text-sm font-bold">
                {participant.displayName}
              </span>
              <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
                {getParticipationWeightLabel(participant.defaultWeightUnits)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight">Expense breakdown</h2>
        {snapshot.expenses.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted-foreground">
            No expense records are available.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {snapshot.expenses.map((expense) => (
              <article
                key={expense.id}
                className="rounded-2xl border border-border bg-surface-muted p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{expense.description}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paid by {expense.payerName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary">
                      {formatMoneyMinorUnits(expense.amountMinor)}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                      {expense.status}
                    </span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  {expense.allocations.map((allocation) => (
                    <li
                      key={`${expense.id}:${allocation.participantId}:${allocation.allocationOrder}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {allocation.participantName} · {getParticipationWeightLabel(allocation.weightUnits)}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatMoneyMinorUnits(allocation.shareAmountMinor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight">Participant balances</h2>
        <div className="mt-4 space-y-3">
          {snapshot.balances.map((balance) => (
            <div
              key={balance.participantId}
              className="rounded-2xl border border-border bg-surface-muted p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {balance.participantName}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Paid {formatMoneyMinorUnits(balance.paidAmountMinor)} · Owes{" "}
                    {formatMoneyMinorUnits(balance.owedAmountMinor)} · Sent{" "}
                    {formatMoneyMinorUnits(balance.repaymentSentAmountMinor)}
                  </p>
                </div>
                <p
                  className={[
                    "shrink-0 text-sm font-bold",
                    balance.netAmountMinor > 0
                      ? "text-success-foreground"
                      : balance.netAmountMinor < 0
                        ? "text-danger"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {formatSignedMoney(balance.netAmountMinor)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight">Who pays whom</h2>
        {snapshot.transfers.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-success-surface p-4 text-success-foreground">
            <p className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 aria-hidden="true" size={18} /> Everyone is balanced
            </p>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {snapshot.transfers.map((transfer) => (
              <li
                key={`${transfer.fromParticipantId}:${transfer.toParticipantId}:${transfer.transferOrder}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted p-4"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                  {transfer.transferOrder + 1}
                </span>
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                  <p className="truncate text-sm font-bold">
                    {transfer.fromParticipantName}
                  </p>
                  <ArrowRight aria-hidden="true" size={16} className="my-1 text-muted-foreground sm:my-0" />
                  <p className="truncate text-sm font-bold">
                    {transfer.toParticipantName}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-primary">
                  {formatMoneyMinorUnits(transfer.amountMinor)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold tracking-tight">Repayment history</h2>
        {snapshot.repayments.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted-foreground">
            No repayments have been recorded.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {snapshot.repayments.map((repayment) => (
              <article
                key={repayment.id}
                className="rounded-2xl border border-border bg-surface-muted p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
                      <span className="truncate">{repayment.fromParticipantName}</span>
                      <ArrowRight aria-hidden="true" size={15} className="shrink-0" />
                      <span className="truncate">{repayment.toParticipantName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(repayment.completedAt)}
                      {repayment.note ? ` · ${repayment.note}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary">
                      {formatMoneyMinorUnits(repayment.amountMinor)}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                      {repayment.status}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
