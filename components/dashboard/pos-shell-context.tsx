"use client";

import { createContext, useContext, type ReactNode } from "react";

export type PosTableMap = Record<
  string,
  { number: number; floorName: string }
>;

type PosShellContextValue = {
  tableMap: PosTableMap;
  isAdmin: boolean;
};

const PosShellContext = createContext<PosShellContextValue | null>(null);

export function PosShellProvider({
  tableMap,
  isAdmin,
  children,
}: PosShellContextValue & { children: ReactNode }) {
  return (
    <PosShellContext.Provider value={{ tableMap, isAdmin }}>
      {children}
    </PosShellContext.Provider>
  );
}

export function usePosShell() {
  return useContext(PosShellContext);
}
