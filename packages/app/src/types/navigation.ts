import {
  Search,
  House,
  Inbox,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavigationPage = "home" | "explore" | "inbox" | "profile";

export const PROFILE_SETTINGS_PATH = "/profile/settings";
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
