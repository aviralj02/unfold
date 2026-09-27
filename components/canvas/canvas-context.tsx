"use client";

import { createContext, useContext } from "react";

export interface CanvasActions {
  /** Break a step down into its own sub-flow. */
  explore: (nodeId: string) => void;
  /** Remove a sub-flow (and any breakdowns nested inside it). */
  removeSubflow: (groupId: string) => void;
}

export const CanvasActionsContext = createContext<CanvasActions>({ explore: () => {}, removeSubflow: () => {} });
export const useCanvasActions = () => useContext(CanvasActionsContext);
