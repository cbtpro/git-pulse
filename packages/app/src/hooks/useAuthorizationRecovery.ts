import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { pendingGitHubAuthorization } from "../services/auth/GitHubDeviceAuth";
import {
  authorizationIsForeground,
  onAuthorizationActivity,
} from "../services/auth/AuthorizationLifecycle";

export function useAuthorizationRecovery(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 3000;
    const resume = () => {
      clearTimeout(timer);
      const auth = useAuthStore.getState();
      if (
        authorizationIsForeground() &&
        !auth.isLoading &&
        auth.authorization &&
        pendingGitHubAuthorization()
      )
        void auth.loginWithGitHub();
    };
    const schedule = () => {
      clearTimeout(timer);
      const auth = useAuthStore.getState();
      if (
        !auth.isLoading &&
        auth.authorization &&
        pendingGitHubAuthorization() &&
        authorizationIsForeground()
      ) {
        timer = setTimeout(resume, delay);
        delay = Math.min(delay * 2, 30000);
      } else if (!auth.authorization) delay = 3000;
    };
    const unsubscribe = useAuthStore.subscribe(schedule);
    const unsubscribeActivity = onAuthorizationActivity(resume);
    schedule();
    return () => {
      clearTimeout(timer);
      unsubscribe();
      unsubscribeActivity();
    };
  }, [ready]);
}
