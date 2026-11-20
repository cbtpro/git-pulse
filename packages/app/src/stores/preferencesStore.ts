import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isLanguage, type Language } from "../i18n/languages";

export type Theme = "system" | "light" | "dark";
export type Density = "comfortable" | "compact";

export const usePreferencesStore = create<{
  theme: Theme;
  density: Density;
  safeArea: boolean;
  headerBlur: boolean;
  language: Language;
  showProfileReadme: boolean;
  showPinnedRepositories: boolean;
  showGitHubPages: boolean;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setSafeArea: (enabled: boolean) => void;
  setHeaderBlur: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
  setShowProfileReadme: (show: boolean) => void;
  setShowPinnedRepositories: (show: boolean) => void;
  setShowGitHubPages: (show: boolean) => void;
}>()(
  persist(
    (set) => ({
      theme: "system",
      density: "comfortable",
      safeArea: true,
      headerBlur: true,
      language: "zh-CN",
      showProfileReadme: false,
      showPinnedRepositories: false,
      showGitHubPages: false,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSafeArea: (safeArea) => set({ safeArea }),
      setHeaderBlur: (headerBlur) => set({ headerBlur }),
      setShowProfileReadme: (showProfileReadme) => set({ showProfileReadme }),
      setShowPinnedRepositories: (showPinnedRepositories) =>
        set({ showPinnedRepositories }),
      setShowGitHubPages: (showGitHubPages) => set({ showGitHubPages }),
      setLanguage: (language) => {
        if (isLanguage(language)) set({ language });
      },
    }),
    {
      name: "gitpulse-preferences",
      merge: (saved, current) => {
        const preferences = saved as Partial<typeof current> | undefined;
        return {
          ...current,
          ...preferences,
          headerBlur:
            typeof preferences?.headerBlur === "boolean"
              ? preferences.headerBlur
              : true,
          language: isLanguage(preferences?.language)
            ? preferences.language
            : current.language,
        };
      },
    },
  ),
);
