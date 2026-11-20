import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Spin } from "@arco-design/web-react";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Code2,
  GitCommitHorizontal,
  Globe,
  Hash,
  History,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../stores/authStore";
import { TokenManager } from "../../services/auth/TokenManager";
import {
  clearSearchCache,
  popularSearches,
  recommendedSearches,
} from "../../services/github/SearchService";
import { useAggregateSearch } from "../../hooks/useAggregateSearch";
import {
  isSearchShortcut,
  useSearchKeyboard,
} from "../../hooks/useSearchKeyboard";
import {
  SEARCH_CATEGORIES,
  type SearchHit,
  type SearchCategory,
  type SearchHistoryEntry,
  type SearchScope,
  type SearchSuggestion,
} from "../../types/search";
import {
  MatchHighlight,
  SearchQueryInput,
  SearchSyntax,
} from "./SearchHighlight";
import { searchIntent } from "../../utils/searchIntent";
import "./search.css";

const icons = {
  repositories: BookOpen,
  users: UserRound,
  organizations: Building2,
  topics: Hash,
  code: Code2,
  commits: GitCommitHorizontal,
  issues: Ticket,
  pages: Globe,
};
let guestHistory: SearchHistoryEntry[] = [];
interface Option {
  id: string;
  title: string;
  description?: string;
  query: string;
  hit?: SearchHit;
  kind?: SearchCategory;
  icon: typeof Search;
}

function SearchPanel({
  close,
  onShowLogin,
  keyboard,
}: {
  close: (restore?: boolean) => void;
  onShowLogin: () => void;
  keyboard: ReturnType<typeof useSearchKeyboard>;
}) {
  const { t, i18n } = useTranslation();
  const { token, activeAccountId } = useAuthStore();
  const navigate = useNavigate();
  const id = useId();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [composing, setComposing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState(() =>
    activeAccountId
      ? TokenManager.getSearchHistory(activeAccountId)
      : guestHistory,
  );
  const [historyError, setHistoryError] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    popular: SearchSuggestion[];
    personal: SearchSuggestion[];
    loading: boolean;
    failed: boolean;
  }>({ popular: [], personal: [], loading: true, failed: false });
  const intent = searchIntent(query);
  const effectiveScope = intent.explicit
    ? intent.scope!
    : scope === "all"
      ? intent.scope || scope
      : scope;
  const routedQuery =
    intent.scope === effectiveScope ? intent.searchQuery : query;
  const result = useAggregateSearch(
    routedQuery,
    effectiveScope,
    token,
    composing,
  );
  const [deleteVisible, setDeleteVisible] = useState<string | null>(null);
  const press = useRef<{
    timer?: number;
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const suppressClick = useRef<string | null>(null);
  const cancelPress = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancelPress, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      popularSearches(token, controller.signal),
      token
        ? recommendedSearches(token, controller.signal)
        : Promise.resolve([]),
    ]).then(([popular, personal]) => {
      if (!controller.signal.aborted)
        setSuggestions({
          popular: popular.status === "fulfilled" ? popular.value : [],
          personal: personal.status === "fulfilled" ? personal.value : [],
          loading: false,
          failed:
            popular.status === "rejected" || personal.status === "rejected",
        });
    });
    return () => controller.abort();
  }, [token]);
  const sections = useMemo(() => {
    const groups: {
      id: string;
      title: string;
      note?: string;
      options: Option[];
      error?: string;
      pending?: boolean;
      externalSearch?: string;
    }[] = [];
    if (query.trim()) {
      if (effectiveScope === "all" || effectiveScope === "repositories")
        groups.push({
          id: "query",
          title: "",
          options: [
            {
              id: "query",
              title: t("在仓库中搜索 {{query}}", { query }),
              query: query.trim(),
              icon: Search,
            },
          ],
        });
      for (const category of SEARCH_CATEGORIES) {
        if (effectiveScope !== "all" && category.id !== effectiveScope)
          continue;
        const group = result.groups[category.id];
        groups.push({
          id: category.id,
          title: t(category.label),
          note: group?.total
            ? group.total.toLocaleString(i18n.language)
            : undefined,
          error: group?.error,
          externalSearch: group?.externalSearch,
          pending: result.pending.includes(category.id),
          options: (group?.hits || []).map((hit) => ({
            id: `${hit.kind}:${encodeURIComponent(hit.id)}`,
            title: hit.title,
            description: [hit.description, hit.detail]
              .filter(Boolean)
              .join(" · "),
            query: hit.query,
            hit,
            icon: icons[hit.kind],
          })),
        });
      }
    } else if (effectiveScope === "all" || effectiveScope === "repositories") {
      groups.push({
        id: "popular",
        title: t("热门搜索"),
        note: t("根据热门仓库推荐"),
        pending: suggestions.loading,
        options: suggestions.popular.map((item, index) => ({
          ...item,
          id: `popular:${index}`,
          kind: "repositories" as const,
          icon: TrendingUp,
        })),
      });
      groups.push({
        id: "personal",
        title: t("你可能感兴趣"),
        note: token
          ? t("根据收藏仓库的语言和主题推荐")
          : t("登录后根据收藏推荐"),
        pending: suggestions.loading,
        options: suggestions.personal.map((item, index) => ({
          ...item,
          id: `personal:${index}`,
          kind: "repositories" as const,
          icon: Sparkles,
        })),
      });
    }
    groups.push({
      id: "history",
      title: t("最近搜索"),
      options: history
        .filter(
          (item) => effectiveScope === "all" || item.kind === effectiveScope,
        )
        .map((item) => ({
          id: `history:${item.kind}:${encodeURIComponent(item.query)}`,
          title: item.query,
          query: item.query,
          kind: item.kind,
          icon: History,
        })),
    });
    return groups;
  }, [
    query,
    effectiveScope,
    result.groups,
    result.pending,
    suggestions,
    history,
    t,
    i18n.language,
    token,
  ]);
  const options = sections.flatMap((section) => section.options);
  const active = options.findIndex((option) => option.id === activeId);
  const activeOption = options[active];
  useEffect(() => {
    setActiveId(null);
  }, [query, scope, composing]);
  useEffect(() => {
    if (activeOption)
      document
        .getElementById(`${id}-${activeOption.id}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeOption?.id, id]);
  const persistHistory = (next: SearchHistoryEntry[]) => {
    setHistory(next);
    if (activeAccountId)
      void TokenManager.saveRecentSearches(activeAccountId, next).catch(() =>
        setHistoryError(true),
      );
    else guestHistory = next;
  };
  const select = (option: Option) => {
    const value = option.query.trim();
    const kind =
      option.hit?.kind ||
      option.kind ||
      (effectiveScope === "all"
        ? searchIntent(value).scope || "repositories"
        : effectiveScope);
    if (!value) return;
    persistHistory(
      [
        { query: value, kind },
        ...history.filter((item) => item.query !== value || item.kind !== kind),
      ].slice(0, 10),
    );
    close(false);
    navigate(`/explore?${new URLSearchParams({ q: value, type: kind })}`, {
      state: {
        aggregateSearch: true,
        selection: option.hit
          ? { hit: option.hit, sourceQuery: query.trim() }
          : undefined,
      },
    });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing || event.nativeEvent.isComposing || event.keyCode === 229) {
      event.stopPropagation();
      return;
    }
    // Keep native text editing and OS/browser shortcuts intact.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length) {
        const index =
          event.key === "ArrowDown"
            ? (active + 1) % options.length
            : (active <= 0 ? options.length : active) - 1;
        setActiveId(options[index].id);
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) select(activeOption);
      else if (query.trim())
        select({
          id: "query",
          title: query,
          query: intent.repositoryQuery,
          icon: Search,
        });
    }
  };
  const totalHits = Object.values(result.groups).reduce(
    (count, group) => count + (group?.hits.length || 0),
    0,
  );
  const renderSection = (section: (typeof sections)[number]) => (
    <div
      key={section.id}
      className="gp-search-result-group"
      role="group"
      aria-labelledby={
        section.title ? `${id}-heading-${section.id}` : undefined
      }
    >
      {section.title && (
        <div className="gp-search-group-heading">
          <div
            className="gp-search-group-title"
            id={`${id}-heading-${section.id}`}
          >
            {section.title}
          </div>
          <span>{section.note}</span>
          {section.id === "history" && section.options.length > 0 && (
            <span className="gp-history-touch-hint">{t("长按记录可删除")}</span>
          )}
        </div>
      )}
      {result.groups[section.id as keyof typeof result.groups]?.incomplete && (
        <p className="gp-search-group-message">
          {t("部分结果，GitHub 未完成全部搜索")}
        </p>
      )}
      {section.pending && (
        <div className="gp-search-group-message">
          <Spin size={12} />
          <span>{t("正在搜索…")}</span>
        </div>
      )}
      {section.error && (
        <p className="gp-search-group-message">{t(section.error)}</p>
      )}
      {!section.pending && !section.error && !section.options.length && (
        <p className="gp-search-group-message">
          {section.id === "history"
            ? t("暂无最近搜索")
            : section.id === "personal"
              ? t("收藏仓库后，这里会显示相关方向。")
              : t("暂无匹配结果")}
        </p>
      )}
      <div
        className={
          section.id === "personal" || section.id === "history"
            ? "gp-search-chips"
            : undefined
        }
      >
        {section.options.map((option) => {
          const index = options.findIndex((item) => item.id === option.id);
          const Icon = option.icon;
          const element = (
            <div
              id={`${id}-${option.id}`}
              key={option.id}
              role="option"
              aria-label={[option.title, option.description]
                .filter(Boolean)
                .join(" · ")}
              aria-selected={active === index}
              className="gp-search-option"
              title={option.title}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActiveId(option.id)}
              onPointerDown={(event) => {
                if (section.id !== "history" || event.pointerType === "mouse")
                  return;
                cancelPress();
                suppressClick.current = null;
                setDeleteVisible(null);
                press.current = {
                  x: event.clientX,
                  y: event.clientY,
                  id: option.id,
                  timer: window.setTimeout(() => {
                    setDeleteVisible(option.id);
                    suppressClick.current = option.id;
                  }, 500),
                };
              }}
              onPointerMove={(event) => {
                if (
                  press.current &&
                  Math.hypot(
                    event.clientX - press.current.x,
                    event.clientY - press.current.y,
                  ) > 10
                )
                  cancelPress();
              }}
              onPointerUp={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(event) => {
                if (section.id === "history") event.preventDefault();
              }}
              onClick={() => {
                if (suppressClick.current === option.id) {
                  suppressClick.current = null;
                  return;
                }
                select(option);
              }}
            >
              <Icon size={17} aria-hidden="true" />
              <div>
                <strong>
                  {section.id === "history" ? (
                    <SearchSyntax value={option.title} />
                  ) : (
                    <MatchHighlight text={option.title} query={query} />
                  )}
                </strong>
                {option.description && (
                  <span>
                    <MatchHighlight text={option.description} query={query} />
                  </span>
                )}
              </div>
              <ArrowUpRight size={13} aria-hidden="true" />
            </div>
          );
          if (section.id !== "history") return element;
          return (
            <div
              key={option.id}
              className={`gp-search-history-chip${deleteVisible === option.id ? " is-delete-visible" : ""}`}
            >
              {element}
              <button
                className="gp-history-delete"
                type="button"
                title={t("删除最近搜索 {{query}}", { query: option.query })}
                aria-label={t("删除最近搜索 {{query}}", {
                  query: option.query,
                })}
                onClick={() => {
                  cancelPress();
                  setDeleteVisible(null);
                  setActiveId(null);
                  persistHistory(
                    history.filter(
                      (item) =>
                        item.query !== option.query ||
                        item.kind !== option.kind,
                    ),
                  );
                  document.getElementById(`${id}-input`)?.focus();
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="gp-global-search-shell">
      <div className="gp-global-search-input" role="search">
        <Search size={17} aria-hidden="true" className="gp-search-input-icon" />
        <SearchQueryInput
          id={`${id}-input`}
          composing={composing}
          autoFocus
          type="search"
          role="combobox"
          aria-label={t("聚合搜索")}
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-describedby={
            keyboard.showKeyboardHints ? `${id}-hint` : undefined
          }
          enterKeyHint="search"
          aria-activedescendant={
            activeOption ? `${id}-${activeOption.id}` : undefined
          }
          placeholder={t("搜索 GitHub，支持高级语法")}
          value={query}
          onChange={setQuery}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setQuery(event.currentTarget.value);
            setComposing(false);
          }}
          onKeyDown={onKeyDown}
        />
        <Button
          type="text"
          icon={<X size={17} />}
          aria-label={t("关闭搜索")}
          onClick={() => close(true)}
        />
      </div>
      <div className="gp-global-search-panel">
        <div
          className="gp-search-scopes"
          aria-label={t("搜索分类")}
          role="group"
        >
          {[{ id: "all", label: "全部" }, ...SEARCH_CATEGORIES]
            .filter(
              (category) =>
                (!intent.explicit && scope !== "all") ||
                !intent.scope ||
                category.id === intent.scope,
            )
            .map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={effectiveScope === category.id}
                onClick={() => setScope(category.id as SearchScope)}
              >
                {t(category.label)}
              </button>
            ))}
        </div>
        <p className="gp-search-syntax">
          {t("支持 GitHub 高级搜索语法")}
          <code>repo: user: org: language: stars: topic:</code>
          <a
            href="https://docs.github.com/search-github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("查看高级搜索语法")}
          >
            <ArrowUpRight size={13} />
          </a>
        </p>
        <div className="gp-search-results-scroll">
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={t("聚合搜索结果")}
            aria-busy={result.loading}
            aria-owns={
              sections
                .find((section) => section.id === "history")
                ?.options.map((option) => `${id}-${option.id}`)
                .join(" ") || undefined
            }
          >
            {sections
              .filter((section) => section.id !== "history")
              .map(renderSection)}
          </div>
          {Object.values(result.groups)
            .filter((group) => group?.externalSearch)
            .map((group) => (
              <a
                key={group!.kind}
                className="gp-search-external"
                href={group!.externalSearch}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("在 GitHub 搜索代码")}
                <ArrowUpRight size={13} />
              </a>
            ))}
          {!query.trim() && suggestions.failed && (
            <p className="gp-search-group-message">
              {t("推荐暂不可用，仍可直接输入搜索。")}
            </p>
          )}
          {sections
            .filter((section) => section.id === "history")
            .map(renderSection)}
          {sections.find((section) => section.id === "history")!.options
            .length > 0 && (
            <Button
              type="text"
              size="small"
              onClick={() =>
                persistHistory(
                  effectiveScope === "all"
                    ? []
                    : history.filter((item) => item.kind !== effectiveScope),
                )
              }
            >
              {t(
                effectiveScope === "all" ? "清空最近搜索" : "清空当前类型记录",
              )}
            </Button>
          )}
          {historyError && (
            <p role="alert" className="gp-search-group-message">
              {t("最近搜索未能保存，请稍后重试")}
            </p>
          )}
          {!token && (
            <Button
              type="text"
              size="small"
              onClick={() => {
                close(false);
                onShowLogin();
              }}
            >
              {t("登录 GitHub")}
            </Button>
          )}
        </div>
        {keyboard.showKeyboardHints && (
          <div className="gp-search-footer" id={`${id}-hint`}>
            <span>
              <kbd aria-label={t("方向键")}>↑ ↓</kbd>
              {t("选择")}
            </span>
            <span>
              <kbd aria-label={keyboard.isApple ? "Return" : "Enter"}>
                {keyboard.isApple ? "↵" : "Enter"}
              </kbd>
              {t("查看")}
            </span>
            <span>
              <kbd>Esc</kbd>
              {t("关闭")}
            </span>
          </div>
        )}
        <span
          className="gp-sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {composing
            ? ""
            : result.loading
              ? t("正在聚合搜索")
              : query.trim()
                ? t("已找到 {{count}} 条预览结果", { count: totalHits })
                : t("可浏览热门搜索、兴趣推荐和最近搜索")}
        </span>
      </div>
    </div>
  );
}

export function GlobalSearch({ onShowLogin }: { onShowLogin: () => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const keyboard = useSearchKeyboard();
  const token = useAuthStore((state) => state.token);
  const root = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const restoreFocus = useRef(false);
  const close = useCallback((restore = false) => {
    restoreFocus.current = restore;
    setOpen(false);
  }, []);
  useLayoutEffect(() => {
    // Restore only after React makes the trigger visible again. A frame callback
    // can run before that commit and silently leave keyboard focus on the body.
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      document.getElementById(triggerId)?.focus({ preventScroll: true });
    }
  }, [open, triggerId]);
  useEffect(() => {
    clearSearchCache();
  }, [token]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      const height = viewport?.height || window.innerHeight;
      document.body.style.setProperty(
        "--gp-search-viewport-height",
        `${height}px`,
      );
      document.body.dataset.searchCompact = String(height < 420);
    };
    if (open) {
      document.body.dataset.searchOpen = "true";
      resize();
    }
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      delete document.body.dataset.searchOpen;
      delete document.body.dataset.searchCompact;
      document.body.style.removeProperty("--gp-search-viewport-height");
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, close]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (isSearchShortcut(event, keyboard.isApple)) {
        event.preventDefault();
        if (open) close(true);
        else setOpen(true);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [open, close, keyboard.isApple]);
  return (
    <div
      className={`gp-global-search${open ? " gp-global-search-open" : ""}`}
      ref={root}
      onKeyDown={(event) => {
        if (
          open &&
          event.key === "Escape" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing &&
          event.keyCode !== 229
        ) {
          event.preventDefault();
          close(true);
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          close(false);
      }}
    >
      <Button
        id={triggerId}
        className="gp-search-shortcut"
        type="text"
        aria-label={t("聚合搜索")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-keyshortcuts={keyboard.shortcut}
        onClick={() => setOpen(true)}
      >
        <Search size={17} />
        <span>{t("聚合搜索")}</span>
        {keyboard.showKeyboardHints && (
          <kbd aria-hidden="true">{keyboard.isApple ? "⌘ K" : "Ctrl K"}</kbd>
        )}
      </Button>
      {open && (
        <SearchPanel
          close={close}
          onShowLogin={onShowLogin}
          keyboard={keyboard}
        />
      )}
    </div>
  );
}
