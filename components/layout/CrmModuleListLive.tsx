"use client";

import { createContext, useContext, type ReactNode } from "react";

const CrmListLiveContext = createContext(false);

/** Только дерево актуального RSC, не replay из кэша. */
export function CrmModuleListLive({ children }: { children: ReactNode }) {
  return (
    <CrmListLiveContext.Provider value={true}>{children}</CrmListLiveContext.Provider>
  );
}

export function useCrmModuleListLive(): boolean {
  return useContext(CrmListLiveContext);
}
