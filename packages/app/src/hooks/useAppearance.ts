import { useEffect } from "react";
import { useSafeArea } from "./useSafeArea";
import { usePreferencesStore } from "../stores/preferencesStore";

export function useAppearance() {
  const { theme, density, safeArea, headerBlur } = usePreferencesStore();
  useSafeArea(safeArea);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      if (dark) document.body.setAttribute("arco-theme", "dark");
      else document.body.removeAttribute("arco-theme");
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.body.dataset.density = density;
  }, [density]);
  useEffect(() => {
    document.body.dataset.headerBlur = headerBlur ? "on" : "off";
  }, [headerBlur]);
  return { theme, density, safeArea, headerBlur };
}
