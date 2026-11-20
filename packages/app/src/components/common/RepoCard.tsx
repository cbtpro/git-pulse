import { useTranslation, i18n } from "../../i18n";
import { Card, Tag } from "@arco-design/web-react";
import {
  ArrowUpRight,
  BookOpen,
  GitFork,
  LockKeyhole,
  Star,
} from "lucide-react";
import type { RepositoryCardData } from "../../types/github";
import { formatDate, formatNumber, LANGUAGE_COLORS } from "../../utils/format";
import { repoRoute } from "../../services/github/RepositoryService";

export function RepoCard({
  repo,
  onTopic,
}: {
  repo: RepositoryCardData;
  onTopic?: (topic: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gp-repo-card">
      <div className="gp-repo-heading">
        <BookOpen size={18} className="gp-muted" aria-hidden="true" />
        <a
          href={`#${repoRoute(repo.full_name)}`}
          title={repo.full_name}
        >
          <span>{repo.owner.login} / </span>
          <strong>{repo.name}</strong>
        </a>
        {repo.private && <LockKeyhole size={14} aria-label={t("私有仓库")} />}
        <ArrowUpRight size={16} className="gp-repo-arrow" aria-hidden="true" />
      </div>
      <p className="gp-repo-description">
        {repo.description || t("这个项目还没有填写简介。")}
      </p>
      <div className="gp-repo-topics">
        {(repo.topics || []).slice(0, 3).map((topic) =>
          onTopic ? (
            <button
              className="gp-topic-link"
              key={topic}
              onClick={() => onTopic(topic)}
            >
              {topic}
            </button>
          ) : (
            <Tag key={topic}>{topic}</Tag>
          ),
        )}
        {repo.archived && <Tag color="gray">{t("已归档")}</Tag>}
      </div>
      <div className="gp-repo-meta">
        {repo.language && (
          <span>
            <i
              style={{
                background: LANGUAGE_COLORS[repo.language] || "#8b92a5",
              }}
            />
            {repo.language}
          </span>
        )}
        <span title={`${repo.stargazers_count} Stars`}>
          <Star size={14} />
          {formatNumber(repo.stargazers_count)}
        </span>
        <span title={`${repo.forks_count} Forks`}>
          <GitFork size={14} />
          {formatNumber(repo.forks_count)}
        </span>
        <time
          dateTime={repo.updated_at}
          title={new Date(repo.updated_at).toLocaleString(i18n.language)}
        >
          {t("{{date}}更新", { date: formatDate(repo.updated_at) })}
        </time>
      </div>
    </Card>
  );
}
