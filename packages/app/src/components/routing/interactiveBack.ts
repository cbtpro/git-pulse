export type BackTarget = {
  current: HTMLElement;
  previous: HTMLElement;
  key: string;
};
type Options = {
  target: () => BackTarget | null;
  blocked: () => boolean;
  back: () => void;
};
type Contact = {
  id: number;
  x: number;
  y: number;
  lastX: number;
  time: number;
  velocity: number;
  distance: number;
};

/** No DOM cloning, reparenting, screenshots or router updates during the drag. */
export function installInteractiveBack(stack: HTMLElement, options: Options) {
  let contact: Contact | undefined;
  let target: BackTarget | undefined;
  let width = 0;
  let progress = 0;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let committing = false;
  let suppressClickUntil = 0;
  const paint = (value: number) => {
    progress = Math.max(0, Math.min(1, value));
    stack.style.setProperty("--gp-back-progress", String(progress));
  };
  const cleanup = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    if (target) {
      for (const page of [target.current, target.previous]) {
        delete page.dataset.backLayer;
        page.inert = page.hidden;
      }
    }
    target = undefined;
    contact = undefined;
    committing = false;
    delete stack.dataset.backPhase;
    stack.style.removeProperty("--gp-back-progress");
    stack.style.removeProperty("--gp-back-duration");
  };
  const finishSettle = () => {
    if (!target || stack.dataset.backPhase !== "settling") return;
    clearTimeout(timer);
    if (!committing || options.blocked()) {
      cleanup();
      return;
    }
    stack.dataset.backPhase = "committing";
    // Keep the destination visible until React commits POP. Clearing on popstate
    // would briefly repaint the old page before React applies the new route.
    timer = setTimeout(() => {
      committing = false;
      settle(false);
    }, 1200);
    options.back();
  };
  const settle = (commit: boolean) => {
    contact = undefined;
    cancelAnimationFrame(frame);
    if (!target) {
      cleanup();
      return;
    }
    committing = commit;
    suppressClickUntil = performance.now() + 500;
    const end = commit ? 1 : 0;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : Math.round(150 + Math.abs(end - progress) * 120);
    // Flush only once on release, never on each touchmove.
    void target.current.offsetWidth;
    stack.style.setProperty("--gp-back-duration", `${duration}ms`);
    stack.dataset.backPhase = "settling";
    paint(end);
    clearTimeout(timer);
    timer = setTimeout(finishSettle, duration ? duration + 80 : 0);
  };
  const start = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      if (!committing) settle(false);
      return;
    }
    if (stack.dataset.backPhase || options.blocked()) return;
    const element = event.target instanceof Element ? event.target : null;
    if (
      element?.closest(
        "input,textarea,select,button,a,canvas,[contenteditable='true'],[role='slider']",
      )
    )
      return;
    if (
      document.activeElement?.matches(
        "input,textarea,select,[contenteditable='true']",
      )
    )
      return;
    const touch = event.touches[0],
      bounds = stack.getBoundingClientRect();
    const header = document
      .querySelector(".gp-topbar")
      ?.getBoundingClientRect();
    const nav = document
      .querySelector(".gp-mobile-nav")
      ?.getBoundingClientRect();
    if (
      touch.clientX < bounds.left ||
      touch.clientX > bounds.left + 24 ||
      touch.clientY < (header?.bottom || bounds.top) ||
      (nav?.height && touch.clientY >= nav.top)
    )
      return;
    if (!options.target()) return;
    width = bounds.width;
    contact = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      time: event.timeStamp,
      velocity: 0,
      distance: 0,
    };
  };
  const move = (event: TouchEvent) => {
    if (!contact || committing) return;
    if (event.touches.length !== 1 || options.blocked() || !event.cancelable) {
      settle(false);
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== contact.id) {
      settle(false);
      return;
    }
    const dx = touch.clientX - contact.x,
      dy = Math.abs(touch.clientY - contact.y);
    if (!target) {
      if ((dy > 8 && dy >= Math.abs(dx)) || dx < -8) {
        cleanup();
        return;
      }
      if (dx < 10 || dx < dy * 1.4) return;
      target = options.target() || undefined;
      if (!target) {
        cleanup();
        return;
      }
      paint(0);
      stack.dataset.backPhase = "dragging";
      target.previous.dataset.backLayer = "previous";
      target.current.dataset.backLayer = "current";
      target.current.inert = true;
      target.previous.inert = true;
    }
    event.preventDefault();
    const elapsed = event.timeStamp - contact.time;
    if (elapsed > 0)
      contact.velocity = (touch.clientX - contact.lastX) / elapsed;
    contact.lastX = touch.clientX;
    contact.time = event.timeStamp;
    contact.distance = Math.max(0, Math.min(width, dx));
    cancelAnimationFrame(frame);
    const next = contact.distance / width;
    frame = requestAnimationFrame(() => paint(next));
  };
  const end = (event: TouchEvent) => {
    if (!contact || committing) return;
    if (
      event.touches.length ||
      !Array.from(event.changedTouches).some(
        (touch) => touch.identifier === contact?.id,
      )
    ) {
      settle(false);
      return;
    }
    if (target && event.cancelable) event.preventDefault();
    const distance = contact.distance;
    const velocity =
      event.timeStamp - contact.time < 120 ? contact.velocity : 0;
    cancelAnimationFrame(frame);
    if (target) paint(distance / width);
    settle(
      velocity > -0.25 &&
        (distance > width * 0.35 || (distance > 50 && velocity > 0.55)),
    );
  };
  const interrupt = () => {
    if (!committing) settle(false);
  };
  const visibility = () => {
    if (document.hidden) cleanup();
  };
  const appState = () => {
    if (
      !(window as Window & { __GITPULSE_APP_ACTIVE__?: boolean })
        .__GITPULSE_APP_ACTIVE__
    )
      cleanup();
  };
  const transition = (event: TransitionEvent) => {
    if (event.target === target?.current && event.propertyName === "transform")
      finishSettle();
  };
  const click = (event: MouseEvent) => {
    if (target || performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  stack.addEventListener("touchstart", start, { passive: true });
  stack.addEventListener("touchmove", move, { passive: false });
  stack.addEventListener("touchend", end, { passive: false });
  stack.addEventListener("touchcancel", interrupt);
  stack.addEventListener("transitionend", transition);
  stack.addEventListener("click", click, true);
  window.addEventListener("resize", cleanup);
  window.addEventListener("gitpulse:app-state", appState);
  document.addEventListener("visibilitychange", visibility);
  return {
    cancel: cleanup,
    routeCommitted(key: string) {
      const returned = Boolean(committing && target?.key === key);
      cleanup();
      return returned;
    },
    destroy() {
      cleanup();
      stack.removeEventListener("touchstart", start);
      stack.removeEventListener("touchmove", move);
      stack.removeEventListener("touchend", end);
      stack.removeEventListener("touchcancel", interrupt);
      stack.removeEventListener("transitionend", transition);
      stack.removeEventListener("click", click, true);
      window.removeEventListener("resize", cleanup);
      window.removeEventListener("gitpulse:app-state", appState);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
