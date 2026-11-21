import { TokenManager } from "./TokenManager";
import {
  authorizationIsForeground,
  checkpointAuthorizationExchange,
  onAuthorizationActivity,
} from "./AuthorizationLifecycle";
import type { PendingAuthorization } from "../../types/auth";
import {
  requestGitHubOAuth,
  GITHUB_VERIFICATION_URL,
} from "./GitHubOAuthTransport";

export interface DeviceAuthorization {
  userCode: string;
  verificationUri: string;
  expiresAt: number;
}

const messages: Record<string, string> = {
  access_denied: "你已取消 GitHub 授权，可以重新登录",
  expired_token: "授权验证码已过期，请重新登录",
  token_expired: "授权验证码已过期，请重新登录",
  device_flow_disabled: "GitHub 应用尚未开启设备授权，请联系应用维护者",
  incorrect_client_credentials: "GitHub 登录配置无效，请联系应用维护者",
  incorrect_device_code: "授权验证码无效，请重新登录",
};

function oauthError(error: unknown): Error {
  return new Error(messages[String(error)] || "GitHub 授权失败，请重新登录");
}

// A suspended WebView can delay timers. Recheck the deadline on foreground entry,
// and never exchange a one-time code while the application is in the background.
function waitForPoll(
  session: PendingAuthorization,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    const check = () => {
      clearTimeout(timer);
      const now = Date.now();
      if (
        now >= session.expiresAt ||
        (authorizationIsForeground() && now >= session.nextPollAt)
      ) {
        cleanup();
        resolve();
      } else {
        const deadline = !authorizationIsForeground()
          ? session.expiresAt
          : Math.min(session.nextPollAt, session.expiresAt);
        timer = setTimeout(check, Math.max(1, deadline - now));
      }
    };
    const unsubscribe = onAuthorizationActivity(check);
    signal.addEventListener("abort", onAbort, { once: true });
    check();
  });
}

export function pendingGitHubAuthorization(clientId = getGitHubClientId()) {
  const session = TokenManager.getPendingAuthorization();
  return session &&
    session.clientId === clientId &&
    (session.expiresAt > Date.now() || Boolean(session.accessToken?.trim()))
    ? session
    : null;
}

export function getGitHubClientId(): string {
  const id = import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() || "";
  return id === "your_client_id_here" ? "" : id;
}

export async function authorizeWithGitHub(
  onCode: (authorization: DeviceAuthorization) => void,
  signal: AbortSignal,
  clientId = getGitHubClientId(),
): Promise<string> {
  if (!clientId)
    throw new Error("GitHub 登录尚未配置，请联系应用维护者，或使用 Token 登录");
  let generation = TokenManager.getGeneration();
  let session = pendingGitHubAuthorization(clientId);
  if (!session) {
    await TokenManager.clearPendingAuthorization();
    generation = TokenManager.getGeneration();
    signal.throwIfAborted();
    const startedAt = Date.now();
    const code = await requestGitHubOAuth(
      "device/code",
      {
        client_id: clientId,
        scope: "repo read:user read:org notifications",
      },
      signal,
    );
    signal.throwIfAborted();
    if (code.error) throw oauthError(code.error);
    if (
      typeof code.device_code !== "string" ||
      !code.device_code ||
      typeof code.user_code !== "string" ||
      !code.user_code ||
      code.verification_uri !== GITHUB_VERIFICATION_URL ||
      typeof code.expires_in !== "number" ||
      !Number.isFinite(code.expires_in) ||
      code.expires_in <= 0 ||
      (code.interval !== undefined &&
        (typeof code.interval !== "number" ||
          !Number.isFinite(code.interval) ||
          code.interval <= 0))
    ) {
      throw new Error("GitHub 返回的授权信息不完整，请重新登录");
    }
    const interval = typeof code.interval === "number" ? code.interval : 5;
    session = {
      id: crypto.randomUUID(),
      clientId,
      deviceCode: code.device_code,
      userCode: code.user_code,
      expiresAt: startedAt + code.expires_in * 1000,
      interval,
      nextPollAt: Date.now() + interval * 1000,
    };
    // Persist before showing the browser button: iOS may discard the WebView afterwards.
    await TokenManager.savePendingAuthorization(session, signal, generation);
  }
  signal.throwIfAborted();
  onCode({
    userCode: session.userCode,
    verificationUri: GITHUB_VERIFICATION_URL,
    expiresAt: session.expiresAt,
  });
  if (session.accessToken) return session.accessToken;

  while (Date.now() < session.expiresAt) {
    await waitForPoll(session, signal);
    if (Date.now() >= session.expiresAt) break;
    session.nextPollAt = Date.now() + session.interval * 1000;
    await TokenManager.savePendingAuthorization(session, signal, generation);
    if (!authorizationIsForeground()) continue;
    let result: Record<string, unknown>;
    let receivedResponse = false;
    try {
      result = await checkpointAuthorizationExchange(async () => {
        const response = await requestGitHubOAuth(
          "oauth/access_token",
          {
            client_id: clientId,
            device_code: session.deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          },
          signal,
        );
        signal.throwIfAborted();
        receivedResponse = true;
        if (
          typeof response.access_token === "string" &&
          response.access_token.trim()
        ) {
          session.accessToken = response.access_token;
          await TokenManager.savePendingAuthorization(
            session,
            signal,
            generation,
          );
        }
        return response;
      });
    } catch (error) {
      signal.throwIfAborted();
      if (receivedResponse) throw error;
      // RFC 8628: back off after transport timeouts, retaining the same authorization.
      session.interval = Math.min(
        session.interval * 2,
        Math.max(60, session.interval),
      );
      session.nextPollAt = Date.now() + session.interval * 1000;
      await TokenManager.savePendingAuthorization(session, signal, generation);
      continue;
    }
    signal.throwIfAborted();
    if (typeof result.access_token === "string" && result.access_token.trim()) {
      return result.access_token;
    }
    if (
      result.error !== "authorization_pending" &&
      result.error !== "slow_down"
    ) {
      await TokenManager.clearPendingAuthorization(session.id);
      throw oauthError(result.error);
    }
    if (result.error === "slow_down") {
      session.interval = Math.max(
        session.interval + 5,
        typeof result.interval === "number" && Number.isFinite(result.interval)
          ? result.interval
          : 0,
      );
    }
    session.nextPollAt = Date.now() + session.interval * 1000;
    await TokenManager.savePendingAuthorization(session, signal, generation);
  }
  await TokenManager.clearPendingAuthorization(session.id);
  throw oauthError("expired_token");
}
