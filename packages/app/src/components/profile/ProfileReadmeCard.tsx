import { useCallback } from "react";
import { Card, Skeleton } from "@arco-design/web-react";
import { ArrowUpRight } from "lucide-react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { useTranslation } from "../../i18n";
import {
  profileReadme,
  type ProfileReadme,
} from "../../services/github/ProfileService";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { RequestError } from "../common/ResourceState";
import "./profile-extras.css";

export function readmeUrl(url: string, image: boolean, readme: ProfileReadme) {
  if (!url || !defaultUrlTransform(url)) return "";
  try {
    const result = new URL(url, image ? readme.rawUrl : readme.htmlUrl);
    return ["https:", "http:", ...(image ? [] : ["mailto:"])].includes(
      result.protocol,
    )
      ? result.href
      : "";
  } catch {
    return "";
  }
}

export function ProfileMarkdown({ readme }: { readme: ProfileReadme }) {
  return (
    <div className="gp-profile-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        urlTransform={(url, key) => readmeUrl(url, key === "src", readme)}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          img: ({ node: _node, ...props }) => (
            <img {...props} loading="lazy" referrerPolicy="no-referrer" />
          ),
        }}
      >
        {readme.markdown}
      </Markdown>
    </div>
  );
}

export default function ProfileReadmeCard({
  login,
  token,
  onShowLogin,
}: {
  login: string;
  token: string;
  onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const resource = useGitHubResource(
    useCallback(
      (signal) => profileReadme(login, token, signal),
      [login, token],
    ),
  );
  return (
    <Card className="gp-profile-extra-card">
      <div className="gp-section-heading">
        <h2>{t("个人 Profile")}</h2>
        <a
          className="gp-quiet-link"
          href={`https://github.com/${encodeURIComponent(login)}`}
          target="_blank"
          rel="noreferrer"
        >
          {t("在 GitHub 查看")}
          <ArrowUpRight size={14} />
        </a>
      </div>
      {resource.loading ? (
        <Skeleton animation text={{ rows: 4 }} />
      ) : resource.error ? (
        <RequestError
          error={resource.error}
          retry={resource.reload}
          onLogin={onShowLogin}
        />
      ) : resource.data ? (
        <ProfileMarkdown readme={resource.data} />
      ) : (
        <p className="gp-section-note">
          {t("还没有个人主页 README，可在 GitHub 同名仓库中创建。")}
        </p>
      )}
    </Card>
  );
}
