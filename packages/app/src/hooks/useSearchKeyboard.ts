import { useEffect, useState } from "react";
import { usePlatform } from "./usePlatform";

export function useSearchKeyboard() {
  const { os, isMobile } = usePlatform();
  const [touchPrimary, setTouchPrimary] = useState(
    () =>
      window.matchMedia?.("(hover: none), (pointer: coarse)").matches ?? false,
  );
  useEffect(() => {
    const media = window.matchMedia?.("(hover: none), (pointer: coarse)");
    if (!media) return;
    const update = () => setTouchPrimary(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const isApple = os === "macos" || os === "ios";
  return {
    isApple,
    showKeyboardHints: !isMobile && !touchPrimary,
    shortcut: isApple ? "Meta+K" : "Control+K",
  };
}

export function isSearchShortcut(
  event: KeyboardEvent,
  isApple: boolean,
): boolean {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    event.keyCode !== 229 &&
    !event.repeat &&
    !event.altKey &&
    !event.shiftKey &&
    (isApple
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey && !event.metaKey) &&
    event.key.toLowerCase() === "k"
  );
}
