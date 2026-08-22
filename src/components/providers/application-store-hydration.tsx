"use client";

import { useEffect } from "react";

import { useApplicationStore } from "../../stores/application-store";

export function ApplicationStoreHydration() {
  useEffect(() => {
    let active = true;

    async function hydrateStore() {
      try {
        await useApplicationStore.persist.rehydrate();
      } catch (error) {
        console.error("Unable to restore SplitSukan local data.", error);
      } finally {
        if (active) {
          useApplicationStore.getState().setHasHydrated(true);
        }
      }
    }

    void hydrateStore();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
