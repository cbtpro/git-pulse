import { Search, House, Inbox, UserRound, type LucideIcon } from "lucide-react";

export type NavigationPage = "home" | "explore" | "inbox" | "profile";

export const PROFILE_SETTINGS_PATH = "/profile/settings";
export const PROFILE_PAGE_TITLES: Record<string, string> = {
  [PROFILE_SETTINGS_PATH]: "账号与外观",
  "/profile/collections": "Star 收藏管理",
  "/profile/releases": "版本更新中心",
  "/profile/offline": "离线阅读与草稿",
};

export const isRepositoryPath = (path: string) =>
  /^\/repo\/[^/]+\/[^/]+\/?$/.test(path);
export const isMainPagePath = (path: string) =>
  ["/", "/explore", "/inbox", "/profile"].includes(path) ||
  Boolean(PROFILE_PAGE_TITLES[path]);
export interface NavigationItem {
  id: NavigationPage;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "home", label: "概览", shortLabel: "概览", icon: House },
  { id: "explore", label: "搜索", shortLabel: "搜索", icon: Search },
  { id: "inbox", label: "收件箱", shortLabel: "收件箱", icon: Inbox },
  { id: "profile", label: "我的空间", shortLabel: "我的", icon: UserRound },
];
export const pagePath = (page: NavigationPage) =>
  page === "home" ? "/" : `/${page}`;
