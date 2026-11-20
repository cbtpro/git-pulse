import { createContext, useContext } from "react";
import type { RepositoryDetails } from "../../services/github/RepositoryService";

export interface RepositoryContextValue {
  owner: string;
  name: string;
  repo: RepositoryDetails;
  token: string | null;
  accountId: string | null;
  username: string | null;
  onShowLogin: () => void;
}
export const RepositoryContext = createContext<RepositoryContextValue | null>(null);
export function useRepository() {
  const context = useContext(RepositoryContext);
  if (!context) throw new Error("Repository context missing");
  return context;
}
