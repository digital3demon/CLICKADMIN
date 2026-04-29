"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Кто сейчас делает действия на канбане (из сессии CRM) — для журнала активности. */
export type KanbanActivityActor = {
  userId: string;
  label: string;
};

const KanbanActivityActorContext = createContext<KanbanActivityActor | null>(
  null,
);

export function KanbanActivityActorProvider({
  value,
  children,
}: {
  value: KanbanActivityActor | null;
  children: ReactNode;
}) {
  return (
    <KanbanActivityActorContext.Provider value={value}>
      {children}
    </KanbanActivityActorContext.Provider>
  );
}

export function useKanbanActivityActor(): KanbanActivityActor {
  const v = useContext(KanbanActivityActorContext);
  return v ?? { userId: "", label: "" };
}
