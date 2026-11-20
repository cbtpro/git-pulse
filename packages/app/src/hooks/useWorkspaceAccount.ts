import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { TokenManager } from "../services/auth/TokenManager";

/** An explicit source account stays attached to deep links from the unified inbox. */
export function useWorkspaceAccount() {
  const [params] = useSearchParams();
  const auth = useAuthStore();
  const id = params.get("account") || auth.activeAccountId;
  const saved = id ? TokenManager.getAccount(id) : null;
  return {
    id,
    token: saved?.token || (id === auth.activeAccountId ? auth.token : null),
    username:
      saved?.username || (id === auth.activeAccountId ? auth.username : null),
    missing: Boolean(params.get("account") && !saved),
  };
}
