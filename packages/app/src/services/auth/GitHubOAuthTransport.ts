import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  prepareAuthorizationBrowser,
  authorizationBrowserFailed,
} from "./AuthorizationLifecycle";

export const GITHUB_VERIFICATION_URL = "https://github.com/login/device";
type OAuthEndpoint = "device/code" | "oauth/access_token";

async function requestNativeOAuth(
  endpoint: OAuthEndpoint,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  // Rust limits HTTP to 20s. Also bound the IPC wait: a native task failure must
  // not leave the login form loading forever or prevent immediate cancellation.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(
      () => reject(new Error("GitHub 授权请求超时，请检查网络后重试")),
      25000,
    );
  });
  try {
    return await Promise.race([
      invoke<Record<string, unknown>>("github_oauth_request", {
        endpoint,
        params,
      }),
      interrupted,
    ]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

// OAuth 端点不支持浏览器跨域请求：原生端通过 Rust，网页通过同源代理。
export async function requestGitHubOAuth(
  endpoint: OAuthEndpoint,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  signal.throwIfAborted();
  let data: Record<string, unknown>;
  if (isTauri()) {
    data = await requestNativeOAuth(endpoint, params, signal);
  } else {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`/api/github/login/${endpoint}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("无法连接 GitHub 授权服务，请稍后重试");
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "当前网页未提供 GitHub 授权服务，请使用桌面应用或 Token 登录",
        );
      }
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  }
  signal.throwIfAborted();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("GitHub 授权服务返回了无效响应");
  }
  return data;
}

export async function openGitHubAuthorization(): Promise<void> {
  if (isTauri()) {
    try {
      await prepareAuthorizationBrowser();
      await invoke("open_github_authorization");
    } catch (error) {
      authorizationBrowserFailed();
      throw error;
    }
  } else {
    // 用户点击时同步打开，避免异步弹窗被浏览器拦截。
    window.open(GITHUB_VERIFICATION_URL, "_blank", "noopener,noreferrer");
  }
}
