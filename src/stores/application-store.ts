import { create } from "zustand";
import { calculateSessionBalances } from "../features/balances/balance-model";
import { calculateSettlementTransfers } from "../features/balances/settlement-model";
import { calculateExpenseAllocations } from "../features/expenses/expense-allocation";
import {
  createSessionExpense,
  normalizeExpenseDescription,
  updateSessionExpense,
  type ExpenseId,
  type ExpenseInput,
  type ExpenseMutationResult,
} from "../features/expenses/expense-model";
import { createJSONStorage, persist } from "zustand/middleware";

import { getParticipantRemovalMode } from "../features/participants/participant-removal";
import {
  createSessionParticipant,
  normalizeParticipantDisplayName,
  normalizeParticipantName,
  updateSessionParticipant,
  type ParticipantId,
  type ParticipantInput,
  type ParticipantMutationResult,
} from "../features/participants/participant-model";
import {
  createSessionRepayment,
  updateSessionRepayment,
  type RepaymentId,
  type RepaymentInput,
  type RepaymentMutationResult,
} from "../features/repayments/repayment-model";
import type { SessionFormValues } from "../features/sessions/session-form-model";
import { applySessionSettlementStatus } from "../features/sessions/session-settlement-model";
import {
  createSessionRecord,
  updateSessionRecord,
  type SessionId,
  type SessionRecord,
} from "../features/sessions/session-model";
import {
  currentApplicationSchemaVersion,
  restorePersistedApplicationState,
  type PersistedApplicationState,
} from "./application-persistence";

export const applicationSchemaVersion = currentApplicationSchemaVersion;
export const applicationStorageKey = "splitsukan:data";

type ApplicationState = {
  schemaVersion: number;
  sessions: SessionRecord[];
  hasHydrated: boolean;
};

type ApplicationActions = {
  createSession: (values: SessionFormValues) => SessionRecord;
  updateSession: (
    sessionId: SessionId,
    values: SessionFormValues,
  ) => SessionRecord | undefined;
  deleteSession: (sessionId: SessionId) => boolean;
  getSessionById: (sessionId: SessionId) => SessionRecord | undefined;
  addParticipant: (
    sessionId: SessionId,
    input: ParticipantInput,
  ) => ParticipantMutationResult;
  updateParticipant: (
    sessionId: SessionId,
    participantId: ParticipantId,
    input: ParticipantInput,
  ) => ParticipantMutationResult;
  removeParticipant: (
    sessionId: SessionId,
    participantId: ParticipantId,
  ) => boolean;
  addExpense: (
    sessionId: SessionId,
    input: ExpenseInput,
  ) => ExpenseMutationResult;
  updateExpense: (
    sessionId: SessionId,
    expenseId: ExpenseId,
    input: ExpenseInput,
  ) => ExpenseMutationResult;
  voidExpense: (sessionId: SessionId, expenseId: ExpenseId) => boolean;
  deleteExpense: (sessionId: SessionId, expenseId: ExpenseId) => boolean;
  addRepayment: (
    sessionId: SessionId,
    input: RepaymentInput,
  ) => RepaymentMutationResult;
  updateRepayment: (
    sessionId: SessionId,
    repaymentId: RepaymentId,
    input: RepaymentInput,
  ) => RepaymentMutationResult;
  voidRepayment: (sessionId: SessionId, repaymentId: RepaymentId) => boolean;
  deleteRepayment: (sessionId: SessionId, repaymentId: RepaymentId) => boolean;
  restoreBackupSessions: (sessions: SessionRecord[]) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  resetStore: () => void;
};

export type ApplicationStore = ApplicationState & ApplicationActions;

const initialApplicationState: ApplicationState = {
  schemaVersion: applicationSchemaVersion,
  sessions: [],
  hasHydrated: false,
};

function createId() {
  return crypto.randomUUID();
}

function createTimestamp() {
  return new Date().toISOString();
}

function getOutstandingTransferAmount(
  session: SessionRecord,
  fromParticipantId: ParticipantId,
  toParticipantId: ParticipantId,
  excludedRepaymentId?: RepaymentId,
) {
  const calculationSession = excludedRepaymentId
    ? {
        ...session,
        repayments: session.repayments.filter(
          (repayment) => repayment.id !== excludedRepaymentId,
        ),
      }
    : session;
  const balances = calculateSessionBalances(calculationSession).balances;
  const transfer = calculateSettlementTransfers(balances).find(
    (item) =>
      item.fromParticipantId === fromParticipantId &&
      item.toParticipantId === toParticipantId,
  );

  return transfer?.amountMinor ?? 0;
}

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set, get) => ({
      ...initialApplicationState,

      createSession: (values) => {
        const session = createSessionRecord({
          id: createId(),
          values,
          timestamp: createTimestamp(),
        });

        set((state) => ({ sessions: [...state.sessions, session] }));
        return session;
      },

      updateSession: (sessionId, values) => {
        const existingSession = get().sessions.find(
          (session) => session.id === sessionId,
        );
        if (!existingSession) return undefined;

        const updatedSession = updateSessionRecord({
          session: existingSession,
          values,
          timestamp: createTimestamp(),
        });

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? updatedSession : session,
          ),
        }));
        return updatedSession;
      },

      deleteSession: (sessionId) => {
        if (!get().sessions.some((session) => session.id === sessionId)) {
          return false;
        }

        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
        }));
        return true;
      },

      getSessionById: (sessionId) =>
        get().sessions.find((session) => session.id === sessionId),

      addParticipant: (sessionId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };

        const displayName = normalizeParticipantDisplayName(input.displayName);
        if (!displayName) return { ok: false, reason: "invalid-name" };

        const normalizedName = normalizeParticipantName(displayName);
        if (
          session.participants.some(
            (participant) => participant.normalizedName === normalizedName,
          )
        ) {
          return { ok: false, reason: "duplicate-name" };
        }

        const participantOrder =
          session.participants.reduce(
            (highestOrder, participant) =>
              Math.max(highestOrder, participant.participantOrder),
            -1,
          ) + 1;
        const timestamp = createTimestamp();
        const participant = createSessionParticipant({
          id: createId(),
          displayName,
          participationWeight: input.participationWeight,
          participantOrder,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  participants: [...item.participants, participant],
                  updatedAt: timestamp,
                }
              : item,
          ),
        }));

        return { ok: true, participant };
      },

      updateParticipant: (sessionId, participantId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };

        const participant = session.participants.find(
          (item) => item.id === participantId,
        );
        if (!participant) return { ok: false, reason: "participant-not-found" };

        const displayName = normalizeParticipantDisplayName(input.displayName);
        if (!displayName) return { ok: false, reason: "invalid-name" };

        const normalizedName = normalizeParticipantName(displayName);
        if (
          session.participants.some(
            (item) =>
              item.id !== participantId && item.normalizedName === normalizedName,
          )
        ) {
          return { ok: false, reason: "duplicate-name" };
        }

        const timestamp = createTimestamp();
        const updatedParticipant = updateSessionParticipant({
          participant,
          displayName,
          participationWeight: input.participationWeight,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  participants: item.participants.map((currentParticipant) =>
                    currentParticipant.id === participantId
                      ? updatedParticipant
                      : currentParticipant,
                  ),
                  updatedAt: timestamp,
                }
              : item,
          ),
        }));

        return { ok: true, participant: updatedParticipant };
      },

      removeParticipant: (sessionId, participantId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return false;
        if (!session.participants.some((item) => item.id === participantId)) {
          return false;
        }

        const timestamp = createTimestamp();
        const removalMode = getParticipantRemovalMode(session, participantId);

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  participants:
                    removalMode === "archive"
                      ? item.participants.map((participant) =>
                          participant.id === participantId
                            ? {
                                ...participant,
                                isActive: false,
                                updatedAt: timestamp,
                              }
                            : participant,
                        )
                      : item.participants.filter(
                          (participant) => participant.id !== participantId,
                        ),
                  updatedAt: timestamp,
                }
              : item,
          ),
        }));
        return true;
      },

      addExpense: (sessionId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };

        const description = normalizeExpenseDescription(input.description);
        if (!description) return { ok: false, reason: "invalid-description" };
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
          return { ok: false, reason: "invalid-amount" };
        }

        const activeParticipantIds = new Set(
          session.participants.filter((item) => item.isActive).map((item) => item.id),
        );
        if (!activeParticipantIds.has(input.paidByParticipantId)) {
          return { ok: false, reason: "invalid-payer" };
        }
        if (input.participants.length === 0) {
          return { ok: false, reason: "invalid-participants" };
        }

        const selectedIds = new Set<string>();
        for (const participant of input.participants) {
          if (selectedIds.has(participant.participantId)) {
            return { ok: false, reason: "duplicate-participant" };
          }
          if (
            !activeParticipantIds.has(participant.participantId) ||
            !Number.isSafeInteger(participant.weightUnits) ||
            participant.weightUnits <= 0
          ) {
            return { ok: false, reason: "invalid-participants" };
          }
          selectedIds.add(participant.participantId);
        }

        const id = createId();
        const timestamp = createTimestamp();
        const allocations = calculateExpenseAllocations({
          expenseId: id,
          amountMinor: input.amountMinor,
          participants: input.participants,
        });
        const expense = createSessionExpense({
          id,
          ...input,
          description,
          allocations,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    expenses: [...item.expenses, expense],
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return { ok: true, expense };
      },

      updateExpense: (sessionId, expenseId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };
        const expense = session.expenses.find((item) => item.id === expenseId);
        if (!expense) return { ok: false, reason: "expense-not-found" };

        const description = normalizeExpenseDescription(input.description);
        if (!description) return { ok: false, reason: "invalid-description" };
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
          return { ok: false, reason: "invalid-amount" };
        }

        const activeParticipantIds = new Set(
          session.participants.filter((item) => item.isActive).map((item) => item.id),
        );
        if (!activeParticipantIds.has(input.paidByParticipantId)) {
          return { ok: false, reason: "invalid-payer" };
        }
        if (input.participants.length === 0) {
          return { ok: false, reason: "invalid-participants" };
        }

        const selectedIds = new Set<string>();
        for (const participant of input.participants) {
          if (selectedIds.has(participant.participantId)) {
            return { ok: false, reason: "duplicate-participant" };
          }
          if (
            !activeParticipantIds.has(participant.participantId) ||
            !Number.isSafeInteger(participant.weightUnits) ||
            participant.weightUnits <= 0
          ) {
            return { ok: false, reason: "invalid-participants" };
          }
          selectedIds.add(participant.participantId);
        }

        const timestamp = createTimestamp();
        const allocations = calculateExpenseAllocations({
          expenseId,
          amountMinor: input.amountMinor,
          participants: input.participants,
        });
        const updatedExpense = updateSessionExpense({
          expense,
          ...input,
          description,
          allocations,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    expenses: item.expenses.map((current) =>
                      current.id === expenseId ? updatedExpense : current,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return { ok: true, expense: updatedExpense };
      },

      voidExpense: (sessionId, expenseId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        const expense = session?.expenses.find((item) => item.id === expenseId);
        if (!session || !expense || expense.status === "void") return false;

        const timestamp = createTimestamp();
        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    expenses: item.expenses.map((current) =>
                      current.id === expenseId
                        ? { ...current, status: "void", updatedAt: timestamp }
                        : current,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return true;
      },

      deleteExpense: (sessionId, expenseId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session?.expenses.some((item) => item.id === expenseId)) return false;

        const timestamp = createTimestamp();
        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    expenses: item.expenses.filter(
                      (expense) => expense.id !== expenseId,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return true;
      },

      addRepayment: (sessionId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };

        const participantIds = new Set(
          session.participants.map((participant) => participant.id),
        );
        if (
          !participantIds.has(input.fromParticipantId) ||
          !participantIds.has(input.toParticipantId)
        ) {
          return { ok: false, reason: "invalid-participant" };
        }
        if (input.fromParticipantId === input.toParticipantId) {
          return { ok: false, reason: "same-participant" };
        }
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
          return { ok: false, reason: "invalid-amount" };
        }

        const outstandingAmount = getOutstandingTransferAmount(
          session,
          input.fromParticipantId,
          input.toParticipantId,
        );
        if (outstandingAmount === 0) {
          return { ok: false, reason: "no-outstanding-transfer" };
        }
        if (input.amountMinor > outstandingAmount) {
          return { ok: false, reason: "amount-exceeds-outstanding" };
        }

        const timestamp = createTimestamp();
        const repayment = createSessionRepayment({
          id: createId(),
          ...input,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    repayments: [...item.repayments, repayment],
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return { ok: true, repayment };
      },

      updateRepayment: (sessionId, repaymentId, input) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return { ok: false, reason: "session-not-found" };
        const repayment = session.repayments.find(
          (item) => item.id === repaymentId,
        );
        if (!repayment) return { ok: false, reason: "repayment-not-found" };

        const participantIds = new Set(
          session.participants.map((participant) => participant.id),
        );
        if (
          !participantIds.has(input.fromParticipantId) ||
          !participantIds.has(input.toParticipantId)
        ) {
          return { ok: false, reason: "invalid-participant" };
        }
        if (input.fromParticipantId === input.toParticipantId) {
          return { ok: false, reason: "same-participant" };
        }
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
          return { ok: false, reason: "invalid-amount" };
        }

        const outstandingAmount = getOutstandingTransferAmount(
          session,
          input.fromParticipantId,
          input.toParticipantId,
          repaymentId,
        );
        if (outstandingAmount === 0) {
          return { ok: false, reason: "no-outstanding-transfer" };
        }
        if (input.amountMinor > outstandingAmount) {
          return { ok: false, reason: "amount-exceeds-outstanding" };
        }

        const timestamp = createTimestamp();
        const updatedRepayment = updateSessionRepayment({
          repayment,
          ...input,
          timestamp,
        });

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    repayments: item.repayments.map((current) =>
                      current.id === repaymentId ? updatedRepayment : current,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return { ok: true, repayment: updatedRepayment };
      },

      voidRepayment: (sessionId, repaymentId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        const repayment = session?.repayments.find(
          (item) => item.id === repaymentId,
        );
        if (!session || !repayment || repayment.status === "void") return false;

        const timestamp = createTimestamp();
        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    repayments: item.repayments.map((current) =>
                      current.id === repaymentId
                        ? { ...current, status: "void", updatedAt: timestamp }
                        : current,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return true;
      },

      deleteRepayment: (sessionId, repaymentId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session?.repayments.some((item) => item.id === repaymentId)) {
          return false;
        }

        const timestamp = createTimestamp();
        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? applySessionSettlementStatus(
                  {
                    ...item,
                    repayments: item.repayments.filter(
                      (repayment) => repayment.id !== repaymentId,
                    ),
                    updatedAt: timestamp,
                  },
                  timestamp,
                )
              : item,
          ),
        }));
        return true;
      },

      restoreBackupSessions: (sessions) =>
        set({
          schemaVersion: applicationSchemaVersion,
          sessions: structuredClone(sessions),
          hasHydrated: true,
        }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      resetStore: () => set(initialApplicationState),
    }),
    {
      name: applicationStorageKey,
      version: applicationSchemaVersion,
      storage: createJSONStorage<PersistedApplicationState>(() => localStorage),
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        sessions: state.sessions,
      }),
      skipHydration: true,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedApplicationState(persistedState),
        hasHydrated: false,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) state?.setHasHydrated(true);
      },
    },
  ),
);
