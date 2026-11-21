type Options = {
  canGoBack: () => boolean;
  blocked: () => boolean;
  back: () => void;
};
type Gesture = {
  id: number;
  x: number;
  y: number;
  width: number;
  distance: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  dragging: boolean;
};

/** Only the content viewport moves. No history entries or page instances are created. */
export function installContentBackGesture(
  viewport: HTMLElement,
  options: Options,
) {
  let gesture: Gesture | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let suppressClickUntil = 0;
  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cancel = () => {
    clearTimeout(timer);
    gesture = undefined;
    delete viewport.dataset.backSwipe;
    viewport.style.removeProperty("--gp-back-x");
    viewport.style.removeProperty("--gp-back-y");
    viewport.style.removeProperty("--gp-back-progress");
  };
  const paint = (distance: number) => {
    viewport.style.setProperty("--gp-back-x", `${distance}px`);
    viewport.style.setProperty(
      "--gp-back-progress",
      String(Math.min(1, distance / 80)),
    );
  };
  const settle = (commit: boolean) => {
    if (!gesture?.dragging) {
      cancel();
      return;
    }
    const width = gesture.width;
    gesture = undefined;
    suppressClickUntil = performance.now() + 500;
    viewport.dataset.backSwipe = "settling";
    paint(commit ? width : 0);
    timer = setTimeout(
      () => {
        if (!commit || options.blocked() || !options.canGoBack()) {
          cancel();
          return;
        }
        // Keep the old content offscreen until popstate/the route commit reveals
        // the retained destination. The timeout also recovers from a no-op Back.
        viewport.dataset.backSwipe = "navigating";
        timer = setTimeout(cancel, 500);
        options.back();
      },
      reducedMotion() ? 0 : 180,
    );
  };
  const start = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      cancel();
      return;
    }
    if (viewport.dataset.backSwipe || options.blocked() || !options.canGoBack())
      return;
    const touch = event.touches[0];
    const rect = viewport.getBoundingClientRect();
    const target = event.target instanceof Element ? event.target : null;
    if (
      touch.clientX < rect.left ||
      touch.clientX - rect.left > 24 ||
      target?.closest(
        "input, textarea, select, button, a, canvas, [contenteditable='true'], [role='slider']",
      )
    )
      return;
    // Leave text editing and the software keyboard to the OS.
    if (
      document.activeElement?.matches(
        "input, textarea, select, [contenteditable='true']",
      )
    )
      return;
    gesture = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      width: rect.width,
      distance: 0,
      lastX: touch.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      dragging: false,
    };
    viewport.style.setProperty("--gp-back-y", `${touch.clientY}px`);
  };
  const move = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 1 || options.blocked()) {
      cancel();
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== gesture.id) {
      cancel();
      return;
    }
    const dx = touch.clientX - gesture.x,
      dy = Math.abs(touch.clientY - gesture.y);
    if (!gesture.dragging) {
      if ((dy > 10 && dy >= Math.abs(dx)) || dx < -8) {
        cancel();
        return;
      }
      if (dx < 10 || dx < dy * 1.4) return;
      if (!event.cancelable) {
        cancel();
        return;
      }
      gesture.dragging = true;
      viewport.dataset.backSwipe = "dragging";
    }
    if (!event.cancelable) {
      cancel();
      return;
    }
    event.preventDefault();
    const elapsed = event.timeStamp - gesture.lastTime;
    if (elapsed > 0)
      gesture.velocity = (touch.clientX - gesture.lastX) / elapsed;
    gesture.lastX = touch.clientX;
    gesture.lastTime = event.timeStamp;
    gesture.distance = Math.max(0, Math.min(dx, gesture.width));
    paint(gesture.distance);
  };
  const end = (event: TouchEvent) => {
    if (!gesture) return;
    if (
      event.touches.length ||
      !Array.from(event.changedTouches).some(
        (t) => t.identifier === gesture?.id,
      )
    ) {
      cancel();
      return;
    }
    if (gesture.dragging && event.cancelable) event.preventDefault();
    const fast =
      event.timeStamp - gesture.lastTime < 100 && gesture.velocity > 0.5;
    settle(
      gesture.distance >= Math.min(160, gesture.width * 0.33) ||
        (gesture.distance > 48 && fast),
    );
  };
  const interrupt = () => settle(false);
  const visibility = () => {
    if (document.hidden) cancel();
  };
  const click = (event: MouseEvent) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  viewport.addEventListener("touchstart", start, { passive: true });
  viewport.addEventListener("touchmove", move, { passive: false });
  viewport.addEventListener("touchend", end, { passive: false });
  viewport.addEventListener("touchcancel", interrupt);
  viewport.addEventListener("click", click, true);
  window.addEventListener("popstate", cancel);
  window.addEventListener("resize", cancel);
  document.addEventListener("visibilitychange", visibility);
  return {
    cancel,
    destroy() {
      cancel();
      viewport.removeEventListener("touchstart", start);
      viewport.removeEventListener("touchmove", move);
      viewport.removeEventListener("touchend", end);
      viewport.removeEventListener("touchcancel", interrupt);
      viewport.removeEventListener("click", click, true);
      window.removeEventListener("popstate", cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
