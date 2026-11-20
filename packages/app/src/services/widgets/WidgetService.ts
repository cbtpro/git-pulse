import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { useAuthStore } from "../../stores/authStore";
import { usePreferencesStore } from "../../stores/preferencesStore";
import { github } from "../github/GitHubService";
import { createWidgetSynchronizer } from "./ContributionWidgetSync";
import type { ContributionCalendar } from "../../types/contributions";

interface WidgetStatus {
  supported: boolean;
  available: boolean;
  canPin: boolean;
}
export const useWidgetStore = create<
  WidgetStatus & {
    syncing: boolean;
    updatedAt: number | null;
    error: "fetch" | "write" | null;
  }
>(() => ({
  supported: false,
  available: false,
  canPin: false,
  syncing: false,
  updatedAt: null,
  error: null,
}));
let active: ReturnType<typeof createWidgetSynchronizer> | null = null;
export const refreshContributionWidgets = () => active?.refresh(true);
export const publishContributionCalendar = (
  calendar: ContributionCalendar,
  token: string,
) => active?.accept(calendar, token);
export const pinContributionWidget = (mode: "2d" | "3d") =>
  invoke<boolean>("pin_contribution_widget", { mode });

export function startContributionWidgetSync() {
  if (!isTauri()) return () => {};
  let disposed = false;
  const stop: (() => void)[] = [];
  void invoke<WidgetStatus>("contribution_widget_status")
    .then((status) => {
      if (disposed) return;
      useWidgetStore.setState(status);
      if (!status.available) return;
      const sync = createWidgetSynchronizer({
        fetch: github.contributions,
        write: (snapshot) => invoke("sync_contribution_widget", { snapshot }),
        changed: (state) => useWidgetStore.setState(state),
      });
      active = sync;
      const changed = () => {
        const auth = useAuthStore.getState();
        const account =
          auth.isLoggedIn && auth.token && auth.activeAccountId && auth.username
            ? {
                id: auth.activeAccountId,
                username: auth.username,
                token: auth.token,
              }
            : null;
        void sync.setAccount(account, usePreferencesStore.getState().language);
      };
      stop.push(
        useAuthStore.subscribe((next, previous) => {
          if (
            next.token !== previous.token ||
            next.activeAccountId !== previous.activeAccountId ||
            next.isLoggedIn !== previous.isLoggedIn ||
            next.username !== previous.username
          )
            changed();
        }),
      );
      stop.push(
        usePreferencesStore.subscribe((next, previous) => {
          if (next.language !== previous.language) changed();
        }),
      );
      const foreground = () => {
        if (document.visibilityState !== "hidden") void sync.refresh();
      };
      document.addEventListener("visibilitychange", foreground);
      window.addEventListener("pageshow", foreground);
      stop.push(() => {
        document.removeEventListener("visibilitychange", foreground);
        window.removeEventListener("pageshow", foreground);
        sync.dispose();
        if (active === sync) active = null;
      });
      changed();
    })
    .catch(() => {
      if (!disposed) useWidgetStore.setState({ error: "write" });
    });
  return () => {
    disposed = true;
    stop.forEach((dispose) => dispose());
  };
}
