import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import type { SessionReportSnapshot } from "./report-snapshot-model";
import {
  createSessionReportFileName,
  generateSessionReportPdf,
} from "./report-pdf-generator";

function createSnapshot(): SessionReportSnapshot {
  return {
    generatedAt: "2026-08-23T10:00:00.000Z",
    reportState: "outstanding",
    session: {
      id: "session-1",
      activityName: "Badminton Night!",
      date: "2026-08-25",
      startTime: "20:30",
      venue: "The Roof",
      note: "Court A",
      currency: "MYR",
      status: "active",
      settledAt: null,
    },
    totals: {
      participantCount: 2,
      activeExpenseCount: 1,
      activeExpenseAmountMinor: 7_500,
      completedRepaymentCount: 0,
      completedRepaymentAmountMinor: 0,
      outstandingTransferCount: 1,
      outstandingAmountMinor: 2_500,
    },
    participants: [
      {
        id: "juan",
        displayName: "Juan",
        defaultWeightUnits: 1000,
        participantOrder: 0,
        isActive: true,
      },
      {
        id: "amir",
        displayName: "Amir",
        defaultWeightUnits: 500,
        participantOrder: 1,
        isActive: true,
      },
    ],
    expenses: [
      {
        id: "expense-1",
        description: "Court rental",
        amountMinor: 7_500,
        payerParticipantId: "juan",
        payerName: "Juan",
        status: "active",
        allocations: [
          {
            participantId: "juan",
            participantName: "Juan",
            weightUnits: 1000,
            shareAmountMinor: 5_000,
            allocationOrder: 0,
          },
          {
            participantId: "amir",
            participantName: "Amir",
            weightUnits: 500,
            shareAmountMinor: 2_500,
            allocationOrder: 1,
          },
        ],
        createdAt: "2026-08-23T08:00:00.000Z",
        updatedAt: "2026-08-23T08:00:00.000Z",
      },
    ],
    balances: [
      {
        participantId: "juan",
        participantName: "Juan",
        paidAmountMinor: 7_500,
        owedAmountMinor: 5_000,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: 2_500,
      },
      {
        participantId: "amir",
        participantName: "Amir",
        paidAmountMinor: 0,
        owedAmountMinor: 2_500,
        repaymentSentAmountMinor: 0,
        repaymentReceivedAmountMinor: 0,
        netAmountMinor: -2_500,
      },
    ],
    transfers: [
      {
        fromParticipantId: "amir",
        fromParticipantName: "Amir",
        toParticipantId: "juan",
        toParticipantName: "Juan",
        amountMinor: 2_500,
        transferOrder: 0,
      },
    ],
    repayments: [],
  };
}

describe("report PDF generator", () => {
  it("creates a safe report filename", () => {
    expect(createSessionReportFileName(createSnapshot())).toBe(
      "SplitSukan-Badminton-Night-25-08-2026.pdf",
    );
  });

  it("generates a valid multi-section PDF", async () => {
    const bytes = await generateSessionReportPdf(createSnapshot());
    const document = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(document.getTitle()).toBe("SplitSukan - Badminton Night!");
    expect(document.getAuthor()).toBe("SplitSukan");
  });

  it("paginates long reports", async () => {
    const snapshot = createSnapshot();
    snapshot.participants = Array.from({ length: 60 }, (_, index) => ({
      id: `participant-${index}`,
      displayName: `Participant ${index + 1}`,
      defaultWeightUnits: index % 2 === 0 ? 1000 : 500,
      participantOrder: index,
      isActive: true,
    }));

    const bytes = await generateSessionReportPdf(snapshot);
    const document = await PDFDocument.load(bytes);

    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});
