import { useTranslation, i18n } from "../i18n";
import { useCallback, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Radio,
  Select,
  Tag,
} from "@arco-design/web-react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Compass,
  GitBranch,
  Layers3,
  RefreshCw,
  Star,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { RepoCard } from "../components/common/RepoCard";
import {
  EmptyState,
  LoadingCards,
  RequestError,
} from "../components/common/ResourceState";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useAuthStore } from "../stores/authStore";
import {
  github,
  recentRepositoryQuery,
} from "../services/github/GitHubService";
import { formatNumber } from "../utils/format";

import { MyWorkDashboard } from "../components/workspace/MyWorkDashboard";

const topics = [
  ["人工智能", "artificial-intelligence"],
  ["开发工具", "developer-tools"],
  ["Web 开发", "web-development"],
  ["开源自托管", "self-hosted"],
  ["机器学习", "machine-learning"],
  ["命令行工具", "cli"],
];

function Developers({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const resource = useGitHubResource(
    useCallback((signal) => github.developers(token, signal), [token]),
  );
  if (resource.loading) return <LoadingCards />;
  if (resource.error)
    return (
      <RequestError
        error={resource.error}
        retry={resource.reload}
        onLogin={onShowLogin}
      />
    );
  if (!resource.data?.items.length)
    return (
      <EmptyState
        title={t("暂时没有开发者结果")}
        description={t("请稍后重新打开此页面。")}
      />
    );
  return (
    <div className="gp-developer-grid">
      {resource.data?.items.map((user, i) => (
        <Card key={user.id} className="gp-developer-card">
          <span className="gp-rank">{String(i + 1).padStart(2, "0")}</span>
          <Avatar size={48}>
            <img src={user.avatar_url} alt="" />
          </Avatar>
          <div>
            <a href={user.html_url} target="_blank" rel="noreferrer">
              <strong>{user.login}</strong>
              <ArrowUpRight size={15} />
            </a>
            <p>{t("查看开发者的开源作品")}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HomePage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { token, isLoggedIn, userProfile } = useAuthStore();
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState("repositories");
  const navigate = useNavigate();
  const query = recentRepositoryQuery(days);
  const resource = useGitHubResource(
    useCallback(
      (signal) =>
        github.searchRepositories(query, "stars", 1, token, signal, 6),
      [query, token],
    ),
  );
  const explore = (query: string) =>
    navigate(`/explore?q=${encodeURIComponent(query)}&sort=stars`);
  const repos = resource.data?.items || [];
  const stats = [
    {
      label: t("近 {{days}} 天的新仓库", { days }),
      value: resource.data ? formatNumber(resource.data.total_count) : "—",
      icon: BookOpen,
    },
    {
      label: t("本页项目累计 Star"),
      value: resource.data
        ? formatNumber(
            repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
          )
        : "—",
      icon: Star,
    },
    {
      label: t("本页使用的语言"),
      value: resource.data
        ? String(
            new Set(repos.map((repo) => repo.language).filter(Boolean)).size,
          )
        : "—",
      icon: Layers3,
    },
  ];
  return (
    <div className="gp-page gp-home">
      <PageHeader
        eyebrow={t("OVERVIEW")}
        title={t(isLoggedIn ? "你的开源工作台" : "发现值得关注的开源")}
        description={t(isLoggedIn ? "先处理协作，再发现新的项目。" : "项目、开发者和灵感，让每一次探索都有收获。")}
        actions={
          <span className="gp-date">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString(i18n.language, {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
        }
      />
      {isLoggedIn && <MyWorkDashboard onShowLogin={onShowLogin} />}
      {!isLoggedIn && <section className="gp-hero">
        <div>
          <span className="gp-hero-kicker">
            <span /> {t("CONNECT TO OPEN SOURCE")}
          </span>
          <h2>
            {t("下一个好想法，")}
            <br />
            {t("从这里开始。")}
          </h2>
          <p>{t("探索新项目，追踪你的协作，把 GitHub 变成更专注的工作台。")}</p>
          <Button size="large" onClick={() => navigate("/explore")}>
            {t("探索仓库")}
            <ArrowRight size={17} />
          </Button>
        </div>
        <div className="gp-hero-art" aria-hidden="true">
          <div className="gp-orbit gp-orbit-outer" />
          <div className="gp-orbit gp-orbit-inner" />
          <div className="gp-hero-git">
            <GitBranch size={58} strokeWidth={1.3} />
          </div>
          <div className="gp-orbit-node gp-node-one">
            <Star size={22} />
          </div>
          <div className="gp-orbit-node gp-node-two">
            <BookOpen size={22} />
          </div>
          <div className="gp-orbit-node gp-node-three">
            <UsersRound size={21} />
          </div>
        </div>
      </section>}
      <div className="gp-stat-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card className="gp-stat-card" key={label}>
            <div className="gp-stat-icon">
              <Icon size={20} />
            </div>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </Card>
        ))}
      </div>
      <div className="gp-home-columns">
        <section className="gp-home-feed">
          <div className="gp-section-heading">
            <Radio.Group
              type="button"
              value={tab}
              onChange={setTab}
              aria-label={t("发现内容")}
            >
              <Radio value="repositories">{t("热门新项目")}</Radio>
              <Radio value="developers">{t("开发者")}</Radio>
            </Radio.Group>
            {tab === "repositories" && (
              <div className="gp-inline-actions">
                <Select
                  aria-label={t("新仓库时间范围")}
                  value={days}
                  onChange={setDays}
                  options={[
                    { label: t("近 7 天"), value: 7 },
                    { label: t("近 30 天"), value: 30 },
                  ]}
                  style={{ width: 108 }}
                />
                <Button
                  aria-label={t("刷新热门项目")}
                  icon={<RefreshCw size={16} />}
                  onClick={resource.reload}
                  loading={resource.loading}
                />
              </div>
            )}
          </div>
          <p className="gp-section-note">
            {tab === "repositories"
              ? t("按累计 Star 排序的新建仓库，每次探索都有新发现。")
              : t("按关注者数量排序，发现活跃的开源创作者。")}
          </p>
          {tab === "developers" ? (
            <Developers onShowLogin={onShowLogin} />
          ) : resource.loading ? (
            <LoadingCards />
          ) : resource.error ? (
            <RequestError
              error={resource.error}
              retry={resource.reload}
              onLogin={onShowLogin}
            />
          ) : repos.length ? (
            <>
              <div className="gp-repo-grid">
                {repos.map((repo) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    onTopic={(topic) => explore(`topic:${topic}`)}
                  />
                ))}
              </div>
              {resource.data?.incomplete_results && (
                <p className="gp-section-note">
                  {t("GitHub 返回了部分结果，稍后重试可获取更完整的数据。")}
                </p>
              )}
              <Button
                className="gp-view-all"
                type="text"
                long
                onClick={() => explore(query)}
              >
                {t("查看全部新项目")}
                <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <EmptyState
              title={t("暂时没有符合条件的项目")}
              description={t("试试更长的时间范围。")}
            />
          )}
        </section>
        <aside className="gp-home-aside">
          <Card className="gp-topic-card">
            <div className="gp-card-title">
              <Compass size={18} />
              <h3>{t("换个方向探索")}</h3>
            </div>
            <p className="gp-muted">{t("从你感兴趣的领域出发")}</p>
            <div className="gp-topic-list">
              {topics.map(([name, topic]) => (
                <button key={topic} onClick={() => explore(`topic:${topic}`)}>
                  <span>{t(name)}</span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          </Card>
          <Card className="gp-workbench-card">
            <Tag color="arcoblue">{t("你的工作台")}</Tag>
            <h3>
              {isLoggedIn
                ? t("你好，{{name}}", {
                    name: userProfile?.name || userProfile?.login,
                  })
                : t("把关注变成连接")}
            </h3>
            <p>
              {isLoggedIn
                ? t("查看自己的项目，让每一次协作都井然有序。")
                : t("登录后即可查看你的通知、仓库和个人资料。")}
            </p>
            <Button
              long
              onClick={isLoggedIn ? () => navigate("/profile") : onShowLogin}
            >
              {isLoggedIn ? t("进入我的空间") : t("连接 GitHub")}
              <ArrowRight size={16} />
            </Button>
          </Card>
          <a
            className="gp-external-resource"
            href="https://github.com/events"
            target="_blank"
            rel="noreferrer"
          >
            {t("参与 GitHub 社区活动")}
            <ArrowUpRight size={15} />
          </a>
        </aside>
      </div>
    </div>
  );
}
