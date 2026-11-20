import { useTranslation } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Message,
  Pagination,
  Select,
} from "@arco-design/web-react";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Code2,
  GitCommitHorizontal,
  Globe,
  Hash,
  RotateCcw,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  SEARCH_CATEGORIES,
  type SearchCategory,
  type SearchGroup,
  type SearchSelection,
} from "../types/search";
import type { Repository } from "../types/github";
import { PageHeader } from "../components/common/PageHeader";
import { RepoCard } from "../components/common/RepoCard";
import { MatchHighlight } from "../components/search/SearchHighlight";
import {
  EmptyState,
  LoadingCards,
  RequestError,
} from "../components/common/ResourceState";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useAuthStore } from "../stores/authStore";
import { TokenManager } from "../services/auth/TokenManager";
import { github, repositoryQuery } from "../services/github/GitHubService";
import { searchCategory, searchPages } from "../services/github/SearchService";
import { cachedGitHubPages } from "../services/github/ProfileService";
import { searchIntent } from "../utils/searchIntent";
import "../components/search/search.css";
import { internalWorkUrl } from "../services/github/CollaborationService";

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
const sortChoices: Partial<Record<SearchCategory, [string, string][]>> = {
  repositories: [
    ["stars", "Star 最多"],
    ["updated", "最近更新"],
    ["forks", "Fork 最多"],
  ],
  users: [
    ["followers", "关注者最多"],
    ["repositories", "仓库最多"],
    ["joined", "最近加入"],
  ],
  organizations: [
    ["followers", "关注者最多"],
    ["repositories", "仓库最多"],
    ["joined", "最近加入"],
  ],
  commits: [["committer-date", "最近提交"]],
  issues: [
    ["updated", "最近更新"],
    ["created", "最近创建"],
    ["comments", "评论最多"],
  ],
};
interface PageResults {
  total: number;
  repositories?: Repository[];
  group?: SearchGroup;
  incomplete?: boolean;
}
export function ExplorePage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t, i18n } = useTranslation();
  const { token, activeAccountId } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const selection = location.state?.selection as SearchSelection | undefined;
  const keyword = params.get("q") || "";
  const kind: SearchCategory =
    SEARCH_CATEGORIES.find((category) => category.id === params.get("type"))
      ?.id || "repositories";
  const hasLanguage = kind === "repositories" || kind === "code";
  const language = hasLanguage ? params.get("language") || "" : "";
  const sorts = sortChoices[kind] || [];
  const sort = sorts.some(([value]) => value === params.get("sort"))
    ? params.get("sort")!
    : "";
  const rawPage = Number(params.get("page"));
  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, kind === "pages" ? 10000 : 100)
      : 1;
  const [input, setInput] = useState(keyword);
  const composing = useRef(false);
  useEffect(() => setInput(keyword), [keyword]);
  useEffect(() => {
    if (location.state?.aggregateSearch)
      document.getElementById("gp-repository-query")?.focus();
  }, [location.key]);
  const update = (changes: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (resetPage) next.delete("page");
    for (const [key, value] of Object.entries(changes))
      value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  const resource = useGitHubResource<PageResults>(
    useCallback(
      async (signal) => {
        if (kind === "repositories") {
          const data = await github.searchRepositories(
            repositoryQuery(keyword, language),
            sort,
            page,
            token,
            signal,
          );
          return {
            total: data.total_count,
            repositories: data.items,
            incomplete: data.incomplete_results,
          };
        }
        if (!keyword.trim() && kind !== "pages") return { total: 0 };
        const intent = searchIntent(keyword);
        const query =
          intent.scope === kind ? intent.searchQuery : keyword.trim();
        if (kind === "pages") {
          if (!token) throw new Error("登录后可搜索你的 GitHub Pages");
          const group = searchPages(
            await cachedGitHubPages(token, signal),
            query,
            page,
            10,
          );
          return { total: group.total, group };
        }
        const group = await searchCategory(
          kind,
          query + (language ? ` language:${language}` : ""),
          token,
          signal,
          { page, perPage: 10, sort },
        );
        if (group.error) {
          if (group.externalSearch) return { total: 0, group };
          throw group.requestError || new Error(group.error);
        }
        return { total: group.total, group, incomplete: group.incomplete };
      },
      [keyword, language, sort, page, token, kind],
    ),
  );
  const total = resource.data?.total || 0;
  const category = SEARCH_CATEGORIES.find((item) => item.id === kind)!;
  const ResultIcon = icons[kind];
  const submit = () => {
    if (composing.current) return;
    const q = input.trim();
    const intent = searchIntent(q);
    const nextKind =
      /\btype:\s*\w+/i.test(q) && intent.scope ? intent.scope : kind;
    update({
      q,
      type: nextKind,
      ...(nextKind !== kind ? { language: "", sort: "" } : {}),
    });
    if (activeAccountId && q)
      void TokenManager.saveRecentSearches(
        activeAccountId,
        [
          { query: q, kind: nextKind },
          ...TokenManager.getSearchHistory(activeAccountId).filter(
            (item) => item.query !== q || item.kind !== nextKind,
          ),
        ].slice(0, 10),
      ).catch(() => Message.error(t("最近搜索未能保存，请稍后重试")));
  };
  const hasResults = Boolean(
    resource.data?.repositories?.length || resource.data?.group?.hits.length,
  );
  return (
    <div className="gp-page gp-search-page">
      <PageHeader
        eyebrow="GitHub"
        title={t("搜索")}
        description={t("按类型搜索 GitHub，使用高级条件缩小范围。")}
      />
      <Card className="gp-search-panel">
        <div
          className="gp-full-search-types"
          role="group"
          aria-label={t("搜索类型")}
        >
          {SEARCH_CATEGORIES.map((item) => {
            const Icon = icons[item.id];
            return (
              <Button
                key={item.id}
                type={kind === item.id ? "primary" : "text"}
                aria-pressed={kind === item.id}
                icon={<Icon size={16} aria-hidden="true" />}
                onClick={() =>
                  update({ type: item.id, sort: "", language: "" })
                }
              >
                {t(item.label)}
              </Button>
            );
          })}
        </div>
        <form
          className="gp-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            id="gp-repository-query"
            aria-label={t("搜索关键词")}
            aria-describedby="gp-search-page-syntax"
            size="large"
            prefix={<Search size={19} aria-hidden="true" />}
            placeholder={t("搜索 GitHub，支持高级语法")}
            value={input}
            onChange={setInput}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setInput(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (composing.current ||
                  event.nativeEvent.isComposing ||
                  event.keyCode === 229)
              )
                event.preventDefault();
            }}
            allowClear
          />
          <Button size="large" type="primary" htmlType="submit">
            {t("搜索")}
          </Button>
        </form>
        <div className="gp-filters">
          {hasLanguage && (
            <Select
              aria-label={t("编程语言")}
              value={language}
              onChange={(value) => update({ language: value })}
              options={[
                { value: "", label: t("所有语言") },
                ...[
                  "TypeScript",
                  "JavaScript",
                  "Python",
                  "Java",
                  "Go",
                  "Rust",
                  "Swift",
                  "Kotlin",
                  "C++",
                  "C#",
                ].map((value) => ({ value, label: value })),
              ]}
            />
          )}
          {sorts.length > 0 && (
            <Select
              aria-label={t("结果排序")}
              value={sort}
              onChange={(value) => update({ sort: value })}
              options={[
                { value: "", label: t("最佳匹配") },
                ...sorts.map(([value, label]) => ({ value, label: t(label) })),
              ]}
            />
          )}
          {(keyword || language || sort) && (
            <Button
              type="text"
              icon={<RotateCcw size={15} />}
              onClick={() => {
                setInput("");
                setParams({ type: kind });
              }}
            >
              {t("重置")}
            </Button>
          )}
          <a
            className="gp-search-help"
            href="https://docs.github.com/search-github"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("查看高级搜索语法")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
        <p id="gp-search-page-syntax" className="gp-search-page-hint">
          {t("一次搜索一种类型，按 Enter 或点击搜索提交。")}
        </p>
        {!keyword && (
          <div className="gp-search-suggestions">
            <span>{t("试试这些方向")}</span>
            {(kind === "repositories"
              ? ["topic:react stars:>100", "language:TypeScript", "user:cbtpro"]
              : kind === "code"
                ? [
                    "useEffect language:TypeScript",
                    "repo:facebook/react filename:package.json",
                  ]
                : kind === "issues"
                  ? ["is:issue is:open label:bug", "is:pr repo:facebook/react"]
                  : kind === "users" || kind === "organizations"
                    ? ["cbtpro", "location:Shanghai followers:>100"]
                    : kind === "topics"
                      ? ["react", "machine-learning"]
                      : kind === "commits"
                        ? ["fix repo:facebook/react"]
                        : ["docs", "github.io"]
            ).map((q) => (
              <button key={q} onClick={() => update({ q })}>
                {q}
              </button>
            ))}
          </div>
        )}
      </Card>
      {selection?.hit?.query === keyword && (
        <div
          className="gp-search-selection"
          role="region"
          aria-label={t("选中的搜索结果")}
        >
          <div>
            <strong>{selection.hit.title}</strong>
            <p>{t("来自搜索：{{query}}", { query: selection.sourceQuery })}</p>
          </div>
          <a href={selection.hit.url} target="_blank" rel="noopener noreferrer">
            {t("查看原始结果")}
            <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <div className="gp-results-heading">
        <h2>{t(category.label)}</h2>
        <span role="status" aria-live="polite">
          {resource.loading
            ? t("正在搜索…")
            : resource.error
              ? t("加载失败")
              : t("共 {{count}} 条结果", {
                  count: total.toLocaleString(i18n.language),
                }) +
                (total > 1000 && kind !== "pages"
                  ? ` · ${t("可浏览前 1,000 个")}`
                  : "")}
        </span>
      </div>
      {resource.data?.incomplete && (
        <Alert
          type="warning"
          content={t("GitHub 本次返回了部分结果，可缩小搜索范围后重试。")}
        />
      )}
      {resource.loading ? (
        <LoadingCards />
      ) : resource.error ? (
        <>
          <RequestError
            error={resource.error}
            retry={resource.reload}
            onLogin={onShowLogin}
          />
          {!token && (kind === "pages" || kind === "code") && (
            <Button onClick={onShowLogin}>{t("登录 GitHub")}</Button>
          )}
        </>
      ) : hasResults ? (
        <>
          {resource.data?.repositories ? (
            <div className="gp-repo-grid gp-explore-grid">
              {resource.data.repositories.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onTopic={(topic) => update({ q: `topic:${topic}` })}
                />
              ))}
            </div>
          ) : (
            <ul className="gp-full-search-results">
              {resource.data?.group?.hits.map((hit) => (
                <li key={hit.id}>
                  <Card>
                    <div className="gp-full-search-result">
                      <ResultIcon size={20} aria-hidden="true" />
                      <div>
                        <a
                          href={
                            internalWorkUrl(hit.url, activeAccountId) || hit.url
                          }
                          target={
                            internalWorkUrl(hit.url, activeAccountId)
                              ? undefined
                              : "_blank"
                          }
                          rel="noopener noreferrer"
                        >
                          <MatchHighlight text={hit.title} query={keyword} />
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                        {hit.description && (
                          <p>
                            <MatchHighlight
                              text={hit.description}
                              query={keyword}
                            />
                          </p>
                        )}
                        {hit.detail && <span>{hit.detail}</span>}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {total > 10 && (
            <nav className="gp-pagination" aria-label={t("搜索结果分页")}>
              <Pagination
                current={page}
                pageSize={10}
                total={kind === "pages" ? total : Math.min(total, 1000)}
                size="small"
                bufferSize={1}
                onChange={(next) => {
                  update({ page: String(next) }, false);
                  document
                    .getElementById("main-content")
                    ?.scrollIntoView({ block: "start" });
                }}
              />
            </nav>
          )}
        </>
      ) : resource.data?.group?.externalSearch ? (
        <Alert
          type="info"
          content={
            <>
              <p>{t(resource.data.group.error!)}</p>
              <a
                href={resource.data.group.externalSearch}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("在 GitHub 搜索代码")}
                <ArrowUpRight size={14} />
              </a>
            </>
          }
        />
      ) : (
        <EmptyState
          title={keyword ? t("暂无匹配结果") : t("输入关键词开始搜索")}
          description={t("选择合适的类型，或调整关键词与高级条件。")}
        />
      )}
    </div>
  );
}
