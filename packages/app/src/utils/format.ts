import { i18n } from "../i18n";

export const formatNumber = (value: number) =>
  new Intl.NumberFormat(i18n.language, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? i18n.t("未知时间")
    : date.toLocaleDateString(i18n.language, {
        month: "short",
        day: "numeric",
      });
}

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#d4b530",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00a7c4",
  Rust: "#ce6a40",
  Ruby: "#b52b2b",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  "C++": "#f34b7d",
  C: "#777",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Vue: "#41b883",
};
