import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { formatMoneyMinorUnits } from "../expenses/expense-model";
import { formatSessionDate } from "../sessions/session-date-format";
import type { SessionReportSnapshot } from "./report-snapshot-model";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GREEN = rgb(0.04, 0.64, 0.42);
const DARK_GREEN = rgb(0.03, 0.23, 0.16);
const TEXT = rgb(0.10, 0.14, 0.12);
const MUTED = rgb(0.38, 0.44, 0.41);
const BORDER = rgb(0.84, 0.88, 0.86);
const SURFACE = rgb(0.96, 0.98, 0.97);
const SUCCESS = rgb(0.06, 0.50, 0.31);
const DANGER = rgb(0.75, 0.16, 0.16);

type PdfContext = {
  document: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
  pageNumber: number;
};

function formatSessionTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return startTime;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
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

async function loadSplitSukanLogo(document: PDFDocument) {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/icons/icon-192x192.png");
    if (!response.ok) return null;

    const logoBytes = await response.arrayBuffer();
    return await document.embedPng(logoBytes);
  } catch (error) {
    console.warn("SplitSukan logo could not be embedded in the PDF.", error);
    return null;
  }
}

function sanitizePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/·/g, "-");
}

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "Session";
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function addPage(context: PdfContext, title?: string) {
  context.page = context.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.pageNumber += 1;
  context.y = PAGE_HEIGHT - MARGIN;

  context.page.drawText("SplitSukan", {
    x: MARGIN,
    y: PAGE_HEIGHT - 30,
    size: 9,
    font: context.bold,
    color: DARK_GREEN,
  });
  context.page.drawText(`Page ${context.pageNumber}`, {
    x: PAGE_WIDTH - MARGIN - 34,
    y: PAGE_HEIGHT - 30,
    size: 8,
    font: context.regular,
    color: MUTED,
  });
  context.page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 38 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 38 },
    thickness: 0.7,
    color: BORDER,
  });
  context.y = PAGE_HEIGHT - 58;

  if (title) {
    context.page.drawText(title, {
      x: MARGIN,
      y: context.y,
      size: 16,
      font: context.bold,
      color: DARK_GREEN,
    });
    context.y -= 28;
  }
}

function ensureSpace(context: PdfContext, height: number, title?: string) {
  if (context.y - height < MARGIN + 20) addPage(context, title);
}

function drawText(
  context: PdfContext,
  text: string,
  options: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    indent?: number;
    maxWidth?: number;
    gapAfter?: number;
  } = {},
) {
  const size = options.size ?? 10;
  const font = options.bold ? context.bold : context.regular;
  const indent = options.indent ?? 0;
  const maxWidth = options.maxWidth ?? CONTENT_WIDTH - indent;
  const lines = wrapText(text, font, size, maxWidth);
  const lineHeight = size * 1.35;
  ensureSpace(context, lines.length * lineHeight + (options.gapAfter ?? 5));

  for (const line of lines) {
    context.page.drawText(line, {
      x: MARGIN + indent,
      y: context.y,
      size,
      font,
      color: options.color ?? TEXT,
    });
    context.y -= lineHeight;
  }
  context.y -= options.gapAfter ?? 5;
}

function drawSectionTitle(context: PdfContext, title: string) {
  ensureSpace(context, 34, title);
  context.page.drawText(sanitizePdfText(title), {
    x: MARGIN,
    y: context.y,
    size: 15,
    font: context.bold,
    color: DARK_GREEN,
  });
  context.y -= 10;
  context.page.drawLine({
    start: { x: MARGIN, y: context.y },
    end: { x: PAGE_WIDTH - MARGIN, y: context.y },
    thickness: 1,
    color: GREEN,
  });
  context.y -= 20;
}

function drawKeyValue(
  context: PdfContext,
  label: string,
  value: string,
  valueColor = TEXT,
) {
  ensureSpace(context, 26);
  context.page.drawText(sanitizePdfText(label), {
    x: MARGIN,
    y: context.y,
    size: 9,
    font: context.regular,
    color: MUTED,
  });
  const cleanValue = sanitizePdfText(value);
  const width = context.bold.widthOfTextAtSize(cleanValue, 10);
  context.page.drawText(cleanValue, {
    x: PAGE_WIDTH - MARGIN - width,
    y: context.y,
    size: 10,
    font: context.bold,
    color: valueColor,
  });
  context.y -= 19;
}

function formatWeight(weightUnits: number) {
  return weightUnits === 500 ? "Half" : "Full";
}

export function createSessionReportFileName(snapshot: SessionReportSnapshot) {
  const date = snapshot.session.date.split("-").reverse().join("-");
  return `SplitSukan-${safeFilePart(snapshot.session.activityName)}-${date}.pdf`;
}

export async function generateSessionReportPdf(
  snapshot: SessionReportSnapshot,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`SplitSukan - ${snapshot.session.activityName}`);
  document.setSubject("SplitSukan session financial report");
  document.setAuthor("SplitSukan");
  document.setCreator("SplitSukan PWA");
  document.setCreationDate(new Date(snapshot.generatedAt));

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadSplitSukanLogo(document);
  const firstPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const context: PdfContext = {
    document,
    regular,
    bold,
    page: firstPage,
    y: PAGE_HEIGHT - MARGIN,
    pageNumber: 1,
  };

  firstPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 154,
    width: PAGE_WIDTH,
    height: 154,
    color: DARK_GREEN,
  });
  if (logo) {
    firstPage.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 105,
      width: 48,
      height: 48,
    });
  }

  const brandTextX = logo ? MARGIN + 62 : MARGIN;

  firstPage.drawText("SPLITSUKAN", {
    x: brandTextX,
    y: PAGE_HEIGHT - 52,
    size: 13,
    font: bold,
    color: GREEN,
  });
  firstPage.drawText("SESSION REPORT", {
    x: brandTextX,
    y: PAGE_HEIGHT - 72,
    size: 11,
    font: bold,
    color: rgb(0.82, 0.93, 0.87),
  });
  const titleLines = wrapText(
    snapshot.session.activityName,
    bold,
    28,
    CONTENT_WIDTH - (logo ? 190 : 120),
  );
  let titleY = PAGE_HEIGHT - 103;
  for (const line of titleLines.slice(0, 2)) {
    firstPage.drawText(line, {
      x: brandTextX,
      y: titleY,
      size: 28,
      font: bold,
      color: rgb(1, 1, 1),
    });
    titleY -= 34;
  }
  const reportLabel = snapshot.reportState.toUpperCase();
  firstPage.drawRectangle({
    x: PAGE_WIDTH - MARGIN - 98,
    y: PAGE_HEIGHT - 61,
    width: 98,
    height: 26,
    color: snapshot.reportState === "settled" ? SUCCESS : GREEN,
  });
  firstPage.drawText(reportLabel, {
    x: PAGE_WIDTH - MARGIN - 88,
    y: PAGE_HEIGHT - 53,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const rightMetadataRows = [
    ["Date", formatSessionDate(snapshot.session.date)],
    ["Time", formatSessionTime(snapshot.session.startTime)],
    ["Venue", snapshot.session.venue],
    ["Generated", formatDateTime(snapshot.generatedAt)],
  ] as const;
  const rightMetadataLabelX = PAGE_WIDTH - MARGIN - 185;
  const rightMetadataValueRight = PAGE_WIDTH - MARGIN;
  const rightMetadataTopY = PAGE_HEIGHT - 82;

  rightMetadataRows.forEach(([label, value], index) => {
    const rowY = rightMetadataTopY - index * 15;
    const cleanValue = sanitizePdfText(value);
    const maxValueWidth = 132;
    let valueSize = 8;

    while (bold.widthOfTextAtSize(cleanValue, valueSize) > maxValueWidth && valueSize > 6.5) {
      valueSize -= 0.25;
    }

    const valueWidth = bold.widthOfTextAtSize(cleanValue, valueSize);
    firstPage.drawText(label, {
      x: rightMetadataLabelX,
      y: rowY,
      size: 7.2,
      font: regular,
      color: rgb(0.70, 0.85, 0.78),
    });
    firstPage.drawText(cleanValue, {
      x: rightMetadataValueRight - valueWidth,
      y: rowY,
      size: valueSize,
      font: bold,
      color: rgb(1, 1, 1),
    });
  });

  context.y = PAGE_HEIGHT - 174;

  drawSectionTitle(context, "Financial summary");
  drawKeyValue(context, "Participants", String(snapshot.totals.participantCount));
  drawKeyValue(
    context,
    "Active expenses",
    `${formatMoneyMinorUnits(snapshot.totals.activeExpenseAmountMinor)} (${snapshot.totals.activeExpenseCount})`,
  );
  drawKeyValue(
    context,
    "Completed repayments",
    `${formatMoneyMinorUnits(snapshot.totals.completedRepaymentAmountMinor)} (${snapshot.totals.completedRepaymentCount})`,
  );
  drawKeyValue(
    context,
    "Outstanding",
    `${formatMoneyMinorUnits(snapshot.totals.outstandingAmountMinor)} (${snapshot.totals.outstandingTransferCount} transfers)`,
    snapshot.totals.outstandingTransferCount === 0 ? SUCCESS : DANGER,
  );

  drawSectionTitle(context, "Participants");
  for (const participant of snapshot.participants) {
    drawKeyValue(
      context,
      participant.displayName,
      `${formatWeight(participant.defaultWeightUnits)}${participant.isActive ? "" : " - Inactive"}`,
    );
  }

  drawSectionTitle(context, "Expense breakdown");
  if (snapshot.expenses.length === 0) {
    drawText(context, "No expense records are available.", { color: MUTED });
  }
  for (const expense of snapshot.expenses) {
    const height = 56 + expense.allocations.length * 19;
    ensureSpace(context, Math.min(height, 170), "Expense breakdown (continued)");
    drawText(context, expense.description, { size: 12, bold: true, gapAfter: 1 });
    drawText(
      context,
      `Paid by ${expense.payerName} - ${formatMoneyMinorUnits(expense.amountMinor)} - ${expense.status}`,
      { size: 9, color: MUTED, gapAfter: 7 },
    );
    for (const allocation of expense.allocations) {
      drawKeyValue(
        context,
        `${allocation.participantName} (${formatWeight(allocation.weightUnits)})`,
        formatMoneyMinorUnits(allocation.shareAmountMinor),
      );
    }
    context.y -= 8;
  }

  drawSectionTitle(context, "Participant balances");
  for (const balance of snapshot.balances) {
    ensureSpace(context, 54, "Participant balances (continued)");
    drawText(context, balance.participantName, { bold: true, gapAfter: 1 });
    drawText(
      context,
      `Paid ${formatMoneyMinorUnits(balance.paidAmountMinor)} - Owes ${formatMoneyMinorUnits(balance.owedAmountMinor)} - Sent ${formatMoneyMinorUnits(balance.repaymentSentAmountMinor)} - Received ${formatMoneyMinorUnits(balance.repaymentReceivedAmountMinor)}`,
      { size: 8.5, color: MUTED, gapAfter: 2 },
    );
    drawKeyValue(
      context,
      "Outstanding net",
      balance.netAmountMinor > 0
        ? `+${formatMoneyMinorUnits(balance.netAmountMinor)}`
        : balance.netAmountMinor < 0
          ? `-${formatMoneyMinorUnits(Math.abs(balance.netAmountMinor))}`
          : formatMoneyMinorUnits(0),
      balance.netAmountMinor === 0
        ? MUTED
        : balance.netAmountMinor > 0
          ? SUCCESS
          : DANGER,
    );
  }

  drawSectionTitle(context, "Who pays whom");
  if (snapshot.transfers.length === 0) {
    drawText(context, "Everyone is balanced. No outstanding transfer is required.", {
      bold: true,
      color: SUCCESS,
    });
  } else {
    for (const transfer of snapshot.transfers) {
      drawKeyValue(
        context,
        `${transfer.transferOrder + 1}. ${transfer.fromParticipantName} -> ${transfer.toParticipantName}`,
        formatMoneyMinorUnits(transfer.amountMinor),
        DANGER,
      );
    }
  }

  drawSectionTitle(context, "Repayment history");
  if (snapshot.repayments.length === 0) {
    drawText(context, "No repayments have been recorded.", { color: MUTED });
  }
  for (const repayment of snapshot.repayments) {
    ensureSpace(context, 58, "Repayment history (continued)");
    drawKeyValue(
      context,
      `${repayment.fromParticipantName} -> ${repayment.toParticipantName}`,
      `${formatMoneyMinorUnits(repayment.amountMinor)} - ${repayment.status}`,
      repayment.status === "completed" ? SUCCESS : MUTED,
    );
    drawText(context, formatDateTime(repayment.completedAt), {
      size: 8.5,
      color: MUTED,
      indent: 8,
      gapAfter: repayment.note ? 1 : 8,
    });
    if (repayment.note) {
      drawText(context, `Note: ${repayment.note}`, {
        size: 8.5,
        color: MUTED,
        indent: 8,
        gapAfter: 8,
      });
    }
  }

  ensureSpace(context, 80);
  context.y -= 12;
  context.page.drawLine({
    start: { x: MARGIN, y: context.y },
    end: { x: PAGE_WIDTH - MARGIN, y: context.y },
    thickness: 1,
    color: BORDER,
  });
  context.y -= 24;
  drawText(
    context,
    snapshot.reportState === "settled"
      ? "FINAL RESULT: This session is fully settled."
      : snapshot.reportState === "outstanding"
        ? `OUTSTANDING: ${snapshot.totals.outstandingTransferCount} transfer(s) totaling ${formatMoneyMinorUnits(snapshot.totals.outstandingAmountMinor)} remain.`
        : "DRAFT: No financial activity has been recorded.",
    {
      size: 11,
      bold: true,
      color: snapshot.reportState === "settled" ? SUCCESS : DARK_GREEN,
    },
  );
  drawText(context, "Generated locally by SplitSukan - Play together. Split fairly.", {
    size: 8,
    color: MUTED,
  });

  const pages = document.getPages();
  pages.forEach((page, index) => {
    const footerText = "Built by Ridzjuan | ridzu.one";
    page.drawLine({
      start: { x: MARGIN, y: 34 },
      end: { x: PAGE_WIDTH - MARGIN, y: 34 },
      thickness: 0.6,
      color: BORDER,
    });
    page.drawText(footerText, {
      x: MARGIN,
      y: 20,
      size: 8,
      font: bold,
      color: DARK_GREEN,
    });
    const pageLabel = String(index + 1) + " / " + String(pages.length);
    const pageLabelWidth = regular.widthOfTextAtSize(pageLabel, 8);
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - pageLabelWidth,
      y: 20,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return document.save();
}

export async function generateSessionReportPdfBlob(
  snapshot: SessionReportSnapshot,
) {
  const bytes = await generateSessionReportPdf(snapshot);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
