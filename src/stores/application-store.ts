import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SessionFormValues } from "../features/sessions/session-form-model";
import {
  createSessionRecord,
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
