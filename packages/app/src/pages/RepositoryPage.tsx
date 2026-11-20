import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, Select, Spin, Tabs, Tag } from "@arco-design/web-react";
import { ArrowLeft, ArrowUpRight, FileCode, Folder, GitBranch, Star } from "lucide-react";
import { useTranslation } from "../i18n";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useWorkspaceAccount } from "../hooks/useWorkspaceAccount";
import { useWorkspaceAction } from "../hooks/useWorkspaceAction";
import { repositories, decodeRepoText, type RepositoryDetails } from "../services/github/RepositoryService";
import { ProfileMarkdown } from "../components/profile/ProfileReadmeCard";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState, RequestError } from "../components/common/ResourceState";
import { RepositoryContext } from "../components/workspace/RepositoryContext";
import "../styles/workspace.css";

function RepositoryContent({ repo, owner, name, token, onShowLogin }: {
  repo: RepositoryDetails; owner: string; name: string; token: string | null; onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const ref = params.get("ref") || repo.default_branch;
  const path = params.get("path") || "";
  const [branchPage, setBranchPage] = useState(1);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [pathInput, setPathInput] = useState(path);
  useEffect(() => setPathInput(path), [path]);
  const update = (values: Record<string, string>) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
    return next;
  });
  const branches = useGitHubResource(useCallback((signal) => repositories.branches(owner, name, branchPage, token, signal), [owner, name, branchPage, token]));
  useEffect(() => { if (branches.data) setBranchOptions((old) => [...new Set([...old, ...branches.data!.data.map((branch) => branch.name)])]); }, [branches.data]);
  const files = useGitHubResource(useCallback((signal) => repositories.contents(owner, name, ref, path, token, signal), [owner, name, ref, path, token]));
  const readme = useGitHubResource(useCallback((signal) => path ? Promise.resolve(null) : repositories.readme(owner, name, ref, token, signal), [owner, name, ref, path, token]));
  const file = files.data && !Array.isArray(files.data) ? files.data : null;
  const text = file ? decodeRepoText(file) : null;
  return <>
    <div className="gp-work-toolbar">
      <label className="gp-work-field"><span><GitBranch size={15} />{t("分支")}</span>
        <Select aria-label={t("分支")} showSearch value={ref} onChange={(value) => update({ ref: value, path: "" })}
          options={[...new Set([ref, ...branchOptions])]} loading={branches.loading} style={{ minWidth: 160 }} />
      </label>
      {branches.data?.hasNext && <Button onClick={() => setBranchPage((value) => value + 1)} disabled={branches.loading}>{t("加载更多分支")}</Button>}
      <form className="gp-work-path" onSubmit={(event) => { event.preventDefault(); update({ path: pathInput.replace(/^\/+|\/+$/g, "") }); }}>
        <Input aria-label={t("文件路径")} placeholder={t("输入文件或目录路径")} value={pathInput} onChange={setPathInput} />
        <Button htmlType="submit">{t("打开")}</Button>
      </form>
    </div>
    {branches.error && <Alert type="warning" content={t(branches.error.message)} />}
    <Card className="gp-work-content">
      <div className="gp-work-toolbar"><Button onClick={() => update({ path: "" })}>{repo.name}</Button><span className="gp-work-break">/{path}</span>
        {path && <Button icon={<ArrowLeft size={15} />} onClick={() => update({ path: path.split("/").slice(0, -1).join("/") })}>{t("上级目录")}</Button>}
      </div>
      {files.loading ? <Spin /> : files.error ? <RequestError error={files.error} retry={files.reload} onLogin={onShowLogin} /> : Array.isArray(files.data) ? (
        <ul className="gp-file-list">{[...files.data].sort((a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name)).map((entry) => <li key={entry.path}>
          <button onClick={() => update({ path: entry.path })}>{entry.type === "dir" ? <Folder size={18} /> : <FileCode size={18} />}<span>{entry.name}</span></button>
          <span>{entry.type === "file" ? `${Math.ceil(entry.size / 1024)} KB` : ""}</span>
        </li>)}</ul>
      ) : file && text !== null ? <pre className="gp-code" tabIndex={0} aria-label={file.name}><code>{text}</code></pre> : file ? <p>{t("此文件暂不支持预览，请在 GitHub 查看。")}</p> : <EmptyState title={t("暂无文件")} description="" />}
      {file && <a className="gp-quiet-link" href={file.html_url} target="_blank" rel="noreferrer">{t("在 GitHub 查看")}<ArrowUpRight size={14} /></a>}
    </Card>
    {!path && <Card title="README" className="gp-work-content">{readme.loading ? <Spin /> : readme.error ? <RequestError error={readme.error} retry={readme.reload} onLogin={onShowLogin} /> : readme.data ? <ProfileMarkdown readme={readme.data} /> : <p>{t("该分支没有可预览的 README。")}</p>}</Card>}
  </>;
}

function RepositoryWorkspace({ repo, owner, name, onShowLogin }: { repo: RepositoryDetails; owner: string; name: string; onShowLogin: () => void }) {
  const { t } = useTranslation();
  const account = useWorkspaceAccount();
  const action = useWorkspaceAction();
  const starred = useGitHubResource(useCallback((signal) => account.token ? repositories.starred(owner, name, account.token, signal) : Promise.resolve(false), [owner, name, account.token]));
  return <RepositoryContext.Provider value={{ repo, owner, name, token: account.token, accountId: account.id, username: account.username, onShowLogin }}>
    <div className="gp-page gp-repository">
      <PageHeader eyebrow={account.username ? `@${account.username}` : "GITHUB"} title={repo.full_name} description={repo.description || ""} actions={<div className="gp-inline-actions">
        <Button icon={<Star size={17} fill={starred.data ? "currentColor" : "none"} />} loading={action.busy} disabled={starred.loading || Boolean(starred.error)} onClick={() => {
          if (!account.token) return onShowLogin();
          void action.run(async () => { await repositories.star(owner, name, !starred.data, account.token!); starred.reload(); });
        }}>{starred.data ? t("取消 Star") : "Star"}</Button>
        <a className="gp-quiet-link" href={repo.html_url} target="_blank" rel="noreferrer"><ArrowUpRight size={17} />GitHub</a>
      </div>} />
      <div className="gp-work-toolbar"><Tag>{repo.private ? t("私有仓库") : t("公开仓库")}</Tag><Tag>{repo.stargazers_count} Stars</Tag>{repo.archived && <Tag>{t("已归档")}</Tag>}</div>
      {starred.error && <RequestError error={starred.error} retry={starred.reload} onLogin={onShowLogin} />}
      <Tabs defaultActiveTab="code"><Tabs.TabPane key="code" title={t("代码与文档")}><RepositoryContent {...{ repo, owner, name, onShowLogin }} token={account.token} /></Tabs.TabPane></Tabs>
    </div>
  </RepositoryContext.Provider>;
}

export function RepositoryPage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { owner = "", name = "" } = useParams();
  const account = useWorkspaceAccount();
  const resource = useGitHubResource(useCallback((signal) => {
    if (account.missing) throw new Error("来源账号已移除，请重新添加账号。");
    return repositories.get(owner, name, account.token, signal);
  }, [owner, name, account.token, account.missing]));
  if (resource.loading) return <div className="gp-page"><Spin tip={t("加载中…")} /></div>;
  if (resource.error) return <div className="gp-page"><RequestError error={resource.error} retry={resource.reload} onLogin={onShowLogin} /></div>;
  return resource.data ? <RepositoryWorkspace key={`${owner}/${name}/${account.id}`} repo={resource.data} {...{ owner, name, onShowLogin }} /> : null;
}
