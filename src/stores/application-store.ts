import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SessionFormValues } from "../features/sessions/session-form-model";
import {
  createSessionRecord,
  updateSessionRecord,
  type SessionId,
  type SessionRecord,
} from "../features/sessions/session-model";
import {
  restorePersistedApplicationState,
  type PersistedApplicationState,
} from "./application-persistence";

export const applicationSchemaVersion = 1;
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
  setHasHydrated: (hasHydrated: boolean) => void;
  resetStore: () => void;
};

export type ApplicationStore = ApplicationState & ApplicationActions;

const initialApplicationState: ApplicationState = {
  schemaVersion: applicationSchemaVersion,
  sessions: [],
  hasHydrated: false,
};

function createSessionId() {
  return crypto.randomUUID();
}

function createTimestamp() {
  return new Date().toISOString();
}

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set, get) => ({
      ...initialApplicationState,

      createSession: (values) => {
        const session = createSessionRecord({
          id: createSessionId(),
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

        if (!existingSession) {
          return undefined;
        }

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
        const sessionExists = get().sessions.some(
          (session) => session.id === sessionId,
        );

        if (!sessionExists) {
          return false;
        }

        set((state) => ({
          sessions: state.sessions.filter(
            (session) => session.id !== sessionId,
          ),
        }));

        return true;
      },

      getSessionById: (sessionId) =>
        get().sessions.find((session) => session.id === sessionId),

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
        if (!error) {
          state?.setHasHydrated(true);
        }
      },
    },
  ),
);
