import type { Location, To } from "react-router-dom";
import {
  NAVIGATION_ITEMS,
  PROFILE_PAGE_TITLES,
  isRepositoryPath,
  pagePath,
  type NavigationPage,
} from "../../types/navigation";

export type PageDestination = { to: To; state?: unknown };
export type NavigationCrumb = PageDestination & {
  label: string;
  literal?: boolean;
};

/** A hierarchy is independent of browser Back: direct links have a safe parent. */
export function buildNavigationTrail(
  location: Location,
  source: Location | undefined,
  remembered: (path: string) => PageDestination,
  restore: (location: Location) => PageDestination,
) {
  const trail: NavigationCrumb[] = [{ label: "概览", ...remembered("/") }];
  const addPage = (path: string, target = remembered(path)) => {
    if (path === "/") {
      trail[0] = { label: "概览", ...target };
      return;
    }
    if (PROFILE_PAGE_TITLES[path]) {
      trail.push({ label: "我的空间", ...remembered("/profile") });
      trail.push({ label: PROFILE_PAGE_TITLES[path], ...target });
    } else {
      const item = NAVIGATION_ITEMS.find((item) => pagePath(item.id) === path);
      if (item) trail.push({ label: item.label, ...target });
    }
  };
  let sectionPath = location.pathname;
  if (isRepositoryPath(location.pathname)) {
    sectionPath = source?.pathname || "/explore";
    addPage(sectionPath, source ? restore(source) : remembered(sectionPath));
    const params = new URLSearchParams(location.search);
    const rawTab = params.get("tab") || "code";
    const tabs: Record<string, string> = {
      code: "代码与文档",
      issues: "Issues",
      pulls: "Pull requests",
      actions: "Actions",
      releases: "版本发布",
    };
    const tab = tabs[rawTab] ? rawTab : "code";
    const base = new URLSearchParams(params);
    for (const key of ["tab", "path", "number", "run"]) base.delete(key);
    const target = (values: Record<string, string> = {}): PageDestination => {
      const query = new URLSearchParams(base);
      for (const [key, value] of Object.entries(values)) query.set(key, value);
      return {
        to: {
          pathname: location.pathname,
          search: query.size ? `?${query}` : "",
        },
      };
    };
    const name = location.pathname
      .split("/")
      .slice(2)
      .filter(Boolean)
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      })
      .join("/");
    trail.push({ label: name, literal: true, ...target() });
    if (tab === "code") {
      const segments = (params.get("path") || "").split("/").filter(Boolean);
      segments.forEach((label, index) =>
        trail.push({
          label,
          literal: true,
          ...target({ path: segments.slice(0, index + 1).join("/") }),
        }),
      );
    } else {
      trail.push({ label: tabs[tab], ...target({ tab }) });
      const key =
        tab === "actions"
          ? "run"
          : tab === "issues" || tab === "pulls"
            ? "number"
            : null;
      const number = key ? params.get(key) : null;
      if (number && /^\d+$/.test(number) && Number(number) > 0)
        trail.push({
          label: `#${number}`,
          literal: true,
          ...restore(location),
        });
    }
  } else addPage(location.pathname, restore(location));
  const section: NavigationPage = sectionPath.startsWith("/profile")
    ? "profile"
    : NAVIGATION_ITEMS.find((item) => pagePath(item.id) === sectionPath)?.id ||
      "home";
  return { trail, section };
}
