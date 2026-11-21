import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installInteractiveBack } from "../src/components/routing/interactiveBack";
import { recordPageHistory } from "../src/components/routing/pageRuntime";
import type { Location } from "react-router-dom";

const location = (key: string): Location => ({
  key,
  pathname: `/${key}`,
  search: "",
  hash: "",
  state: null,
});
it("follows PUSH/REPLACE/POP and drops obsolete forward entries without guessing unknown history", () => {
  let state = recordPageHistory(undefined, location("a"), "POP");
  state = recordPageHistory(state, location("b"), "PUSH");
  state = recordPageHistory(state, location("c"), "REPLACE");
  expect(state.entries.map((entry) => entry.key)).toEqual(["a", "c"]);
  state = recordPageHistory(state, location("a"), "POP");
  expect(state.index).toBe(0);
  state = recordPageHistory(state, location("d"), "PUSH");
  expect(state.entries.map((entry) => entry.key)).toEqual(["a", "d"]);
  state = recordPageHistory(state, location("external"), "POP");
  expect(state).toEqual({ entries: [location("external")], index: 0 });
  // Raw hash navigation can reuse the router's default key. It must not leave
  // every frame inactive or invent an old URL as the previous history entry.
  const raw = { ...location("external"), pathname: "/another-url" };
  state = recordPageHistory(state, raw, "POP");
  expect(state).toEqual({ entries: [raw], index: 0 });
});

let stack: HTMLDivElement, current: HTMLDivElement, previous: HTMLDivElement;
let controller: ReturnType<typeof installInteractiveBack>;
const back = vi.fn(),
  blocked = vi.fn(),
  target = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  stack = document.createElement("div");
  current = document.createElement("div");
  previous = document.createElement("div");
  current.innerHTML = '<input value="draft"><canvas></canvas>';
  previous.innerHTML = "<textarea>previous draft</textarea>";
  previous.hidden = true;
  previous.inert = true;
  current.scrollTop = 240;
  previous.scrollTop = 700;
  stack.append(previous, current);
  document.body.append(stack);
  vi.spyOn(stack, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 390,
    height: 844,
  } as DOMRect);
  blocked.mockReturnValue(false);
  target.mockReturnValue({ current, previous, key: "previous" });
  controller = installInteractiveBack(stack, { target, blocked, back });
});
afterEach(() => {
  controller.destroy();
  stack.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function touch(
  type: string,
  x: number,
  y = 300,
  time = 0,
  count = 1,
  element: Element = current,
) {
  const point = { identifier: 1, clientX: x, clientY: y };
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    touches: {
      value:
        type === "touchend" || type === "touchcancel"
          ? []
          : Array.from({ length: count }, (_, i) => ({
              ...point,
              identifier: i + 1,
            })),
    },
    changedTouches: { value: [point] },
    timeStamp: { value: time },
  });
  element.dispatchEvent(event);
  return event;
}
function drag(x = 220) {
  touch("touchstart", 5);
  touch("touchmove", x, 300, 300);
  vi.advanceTimersByTime(20);
}

it("uses the original pages and holds the destination through popstate until React commits", () => {
  const input = previous.firstElementChild;
  drag();
  expect(current.inert).toBe(true);
  expect(previous.dataset.backLayer).toBe("previous");
  expect(back).not.toHaveBeenCalled();
  touch("touchend", 220, 300, 500);
  vi.advanceTimersByTime(400);
  expect(back).toHaveBeenCalledOnce();
  window.dispatchEvent(new PopStateEvent("popstate"));
  expect(stack.dataset.backPhase).toBe("committing");
  expect(stack.style.getPropertyValue("--gp-back-progress")).toBe("1");
  expect(previous.firstElementChild).toBe(input);
  expect(previous.scrollTop).toBe(700);
  // React makes the already-visible cached target active before cleanup.
  current.hidden = true;
  previous.hidden = false;
  expect(controller.routeCommitted("previous")).toBe(true);
  expect(stack.dataset.backPhase).toBeUndefined();
  expect(previous.inert).toBe(false);
  expect(current.inert).toBe(true);
  expect(previous.scrollTop).toBe(700);
  expect(current.scrollTop).toBe(240);
});

it("cancels a short drag without navigation or changes to either page's form/scroll state", () => {
  drag(60);
  touch("touchend", 60, 300, 600);
  vi.advanceTimersByTime(400);
  expect(back).not.toHaveBeenCalled();
  expect(stack.dataset.backPhase).toBeUndefined();
  expect(current.hidden).toBe(false);
  expect(current.inert).toBe(false);
  expect(previous.hidden).toBe(true);
  expect(previous.querySelector("textarea")?.value).toBe("previous draft");
  expect(previous.scrollTop).toBe(700);
  expect(current.scrollTop).toBe(240);
});

it("ignores duplicate completion/new gestures while settling and recovers from a no-op Back", () => {
  drag();
  touch("touchend", 220, 300, 500);
  touch("touchend", 220, 300, 510);
  drag();
  vi.advanceTimersByTime(400);
  expect(back).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1700);
  expect(stack.dataset.backPhase).toBeUndefined();
  expect(current.inert).toBe(false);
});

it("leaves vertical scrolling, form controls, canvas, multi-touch and unavailable history alone", () => {
  touch("touchstart", 60);
  expect(touch("touchmove", 220, 300, 100).defaultPrevented).toBe(false);
  touch("touchend", 220, 300, 300);
  touch("touchstart", 5);
  expect(touch("touchmove", 8, 340, 100).defaultPrevented).toBe(false);
  for (const child of Array.from(current.children)) {
    touch("touchstart", 5, 300, 0, 1, child);
    expect(touch("touchmove", 220, 300, 100, 1, child).defaultPrevented).toBe(
      false,
    );
  }
  drag();
  touch("touchmove", 230, 300, 400, 2);
  vi.advanceTimersByTime(500);
  blocked.mockReturnValue(true);
  drag();
  blocked.mockReturnValue(false);
  target.mockReturnValue(null);
  drag();
  expect(back).not.toHaveBeenCalled();
  expect(stack.dataset.backPhase).toBeUndefined();
});

it("cleans up on resize/background and on an unrelated route commit", () => {
  drag();
  window.dispatchEvent(new Event("resize"));
  expect(stack.dataset.backPhase).toBeUndefined();
  drag();
  expect(controller.routeCommitted("some-other-route")).toBe(false);
  expect(stack.dataset.backPhase).toBeUndefined();
  drag();
  window.dispatchEvent(new Event("gitpulse:app-state"));
  expect(stack.dataset.backPhase).toBeUndefined();
  expect(back).not.toHaveBeenCalled();
});

it("supports reduced motion without a settling delay and suppresses release clicks", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  drag();
  touch("touchend", 220, 300, 500);
  vi.advanceTimersByTime(0);
  expect(back).toHaveBeenCalledOnce();
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  current.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
});
