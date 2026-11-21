// Native lifecycle events supplement WebView visibility (custom tabs and app
// suspension do not consistently produce browser focus/visibility events).
const APP_STATE_EVENT = "gitpulse:app-state";
let browserOpening = false;
const exchanges = new Set<Promise<unknown>>();

function appIsActive() {
  const native = (window as Window & { __GITPULSE_APP_ACTIVE__?: boolean })
    .__GITPULSE_APP_ACTIVE__;
  return native ?? document.visibilityState !== "hidden";
}

export function authorizationIsForeground() {
  return !browserOpening && appIsActive();
}

export function onAuthorizationActivity(callback: () => void) {
  const activity = () => {
    if (appIsActive()) {
      browserOpening = false;
    }
    callback();
  };
  document.addEventListener("visibilitychange", activity);
  for (const event of ["pageshow", "focus", "online", APP_STATE_EVENT])
    window.addEventListener(event, activity);
  return () => {
    document.removeEventListener("visibilitychange", activity);
    for (const event of ["pageshow", "focus", "online", APP_STATE_EVENT])
      window.removeEventListener(event, activity);
  };
}

export async function checkpointAuthorizationExchange<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const exchange = operation();
  exchanges.add(exchange);
  try {
    return await exchange;
  } finally {
    exchanges.delete(exchange);
  }
}

export async function prepareAuthorizationBrowser() {
  browserOpening = true;
  // Do not suspend the WebView with an exchanged one-time code still waiting
  // to be encrypted. The browser opens only after any current exchange is saved.
  await Promise.all([...exchanges]);
}

export function authorizationBrowserFailed() {
  browserOpening = false;
  window.dispatchEvent(new Event(APP_STATE_EVENT));
}

export function waitForAuthorizationForeground(
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  if (authorizationIsForeground()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      unsubscribe();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    const unsubscribe = onAuthorizationActivity(() => {
      if (authorizationIsForeground()) {
        cleanup();
        resolve();
      }
    });
    signal.addEventListener("abort", abort, { once: true });
  });
}
