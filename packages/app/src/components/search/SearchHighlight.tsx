import { useLayoutEffect, useRef } from "react";
import { Input, type InputProps } from "@arco-design/web-react";

const qualifiers = new Set(
  "repo user org language stars forks size pushed created updated archived fork topic is in author committer assignee mentions involves team label milestone state type sort filename extension path content symbol owner license visibility reviewed-by review-requested commenter project linked draft merged closed comments interactions reactions followers location fullname repos before after hash".split(
    " ",
  ),
);
export interface SearchToken {
  text: string;
  kind: "text" | "qualifier" | "keyword" | "operator";
}
/** Presentation only: never rewrite the query sent to GitHub. */
function plainTokens(text: string): SearchToken[] {
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((text) => ({ text, kind: /^\s+$/.test(text) ? "text" : "keyword" }));
}
export function tokenizeSearch(value: string): SearchToken[] {
  const pattern =
    /(-?[\w-]+:)("(?:\\.|[^"\\])*"?|[^\s]*)|"(?:\\.|[^"\\])*"?|\b(?:AND|OR|NOT)\b/g;
  const result: SearchToken[] = [];
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index!;
    if (index > start) result.push(...plainTokens(value.slice(start, index)));
    if (match[1] && qualifiers.has(match[1].replace(/^-|:$/g, ""))) {
      result.push(
        { text: match[1], kind: "qualifier" },
        { text: match[2], kind: "keyword" },
      );
    } else
      result.push({
        text: match[0],
        kind: match[1]
          ? "text"
          : match[0].startsWith('"')
            ? "keyword"
            : "operator",
      });
    start = index + match[0].length;
  }
  if (start < value.length) result.push(...plainTokens(value.slice(start)));
  return result;
}
export function SearchSyntax({ value }: { value: string }) {
  return (
    <>
      {tokenizeSearch(value).map((token, index) => (
        <span key={index} className={`gp-query-${token.kind}`}>
          {token.text}
        </span>
      ))}
    </>
  );
}
export function MatchHighlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const terms = (query.match(/"[^"]+"|\S+/g) || [])
    .map((word) => word.replace(/^-?[\w-]+:/, "").replace(/^"|"$/g, ""))
    .filter((word) => word.length > 0 && !/^(AND|OR|NOT)$/.test(word))
    .slice(0, 24);
  if (!terms.length) return <>{text}</>;
  const expression = new RegExp(
    `(${terms
      .sort((a, b) => b.length - a.length)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "gi",
  );
  return (
    <>
      {text
        .split(expression)
        .map((part, index) =>
          index % 2 ? <mark key={index}>{part}</mark> : part,
        )}
    </>
  );
}
export function SearchQueryInput({
  composing,
  ...props
}: InputProps & { composing: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const syncScroll = () => {
    const input = root.current?.querySelector("input");
    if (input && mirror.current) mirror.current.scrollLeft = input.scrollLeft;
  };
  useLayoutEffect(() => {
    syncScroll();
    const frame = requestAnimationFrame(syncScroll);
    return () => cancelAnimationFrame(frame);
  }, [props.value, composing]);
  return (
    <div
      ref={root}
      className={`gp-search-query-field${composing ? " is-composing" : ""}`}
    >
      <div
        ref={mirror}
        className="gp-search-query-highlight"
        aria-hidden="true"
      >
        <SearchSyntax value={String(props.value || "")} />
      </div>
      <Input
        {...props}
        className="gp-search-query-input"
        onScroll={syncScroll}
        onSelect={syncScroll}
      />
    </div>
  );
}
