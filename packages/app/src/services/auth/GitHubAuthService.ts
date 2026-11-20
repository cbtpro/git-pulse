import { TokenManager } from "./TokenManager";
import type { AuthResult, UserProfile } from "../../types/auth";

export type { AuthResult } from "../../types/auth";

export class GitHubAuthService {
  // 验证身份后由状态层统一保存，取消的登录请求不得留下凭证。
  static async loginWithToken(
    input: string,
    signal?: AbortSignal,
  ): Promise<AuthResult> {
    const token = input.trim();
    if (!token)
      return { success: false, error: "请输入 GitHub Personal Access Token" };

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      signal?.throwIfAborted();
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        signal: controller.signal,
      });
      signal?.throwIfAborted();
      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "登录凭证无效或已过期，请重新登录",
            invalidCredentials: true,
          };
        }
        if (response.status === 403 || response.status === 429) {
          return {
            success: false,
            error: "GitHub 暂时拒绝访问，请检查授权权限或稍后重试",
          };
        }
        return { success: false, error: "GitHub 服务暂时不可用，请稍后重试" };
      }
      const profile: UserProfile = await response.json();
      signal?.throwIfAborted();
      if (
        !profile ||
        typeof profile.login !== "string" ||
        !profile.login ||
        typeof profile.id !== "number"
      ) {
        return { success: false, error: "GitHub 返回的用户信息不完整，请重试" };
      }
      return { success: true, token, profile };
    } catch {
      signal?.throwIfAborted();
      return { success: false, error: "无法连接 GitHub，请检查网络后重试" };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  static getAuthHeader(): Record<string, string> {
    const token = TokenManager.getToken();
    return {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static logout(): Promise<void> {
    return TokenManager.clearAll();
  }
}
