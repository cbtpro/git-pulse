import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button, Checkbox, Input, Spin } from "@arco-design/web-react";
import { PageModal as Modal } from "../routing/PageModal";
import { ArrowUpRight, BookOpen, Code2, Search, X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { pinnableItems, type PinItem } from "../../services/github/PinService";
import { TokenManager } from "../../services/auth/TokenManager";

export function CustomizePins({
  token,
  accountId,
  initial,
  onSaved,
  onClose,
}: {
  token: string;
  accountId: string;
  initial: PinItem[];
  onSaved: (ids: string[] | undefined) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [showRepos, setShowRepos] = useState(true);
  const [showGists, setShowGists] = useState(true);
  const [selected, setSelected] = useState(initial.map((item) => item.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const resource = useGitHubResource(
    useCallback((signal) => pinnableItems(token, signal), [token]),
  );
  const items = [
    ...new Map(
      [...initial, ...(resource.data || [])].map((item) => [item.id, item]),
    ).values(),
  ];
  const needle = query.trim().toLocaleLowerCase();
  const filtered = items.filter(
    (item) =>
      (item.kind === "repository" ? showRepos : showGists) &&
      `${item.title} ${item.description || ""}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  const save = async (pins: string[] | undefined) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await TokenManager.saveCustomPins(accountId, pins);
      if (mounted.current) onSaved(pins);
    } catch {
      if (mounted.current) {
        setError(t("保存置顶失败，请重试。"));
        setSaving(false);
      }
    }
  };
  const username = TokenManager.getAccount(accountId)?.username;
  return (
    <Modal
      visible
      title={t("定制你的 Pins")}
      className="gp-pins-modal"
      style={{ width: 560, maxWidth: "calc(100vw - 24px)" }}
      autoFocus
      focusLock
      maskClosable={false}
      escToExit={!saving}
      closable={!saving}
      onCancel={onClose}
      closeIcon={<X size={18} aria-label={t("关闭")} />}
      footer={
        <div className="gp-pins-footer">
          <Button
            type="text"
            disabled={saving}
            onClick={() => void save(undefined)}
          >
            {t("使用 GitHub 置顶")}
          </Button>
          <Button disabled={saving} onClick={onClose}>
            {t("取消")}
          </Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => void save(selected)}
          >
            {t("保存修改")}
          </Button>
        </div>
      }
    >
      <p className="gp-pins-note" id={`${id}-note`}>
        {t(
          "最多选择 6 个 Repo 或 Gist。修改仅保存在此设备的 GitPulse，不会同步到 GitHub 个人主页。",
        )}
        {username && (
          <a
            href={`https://github.com/${encodeURIComponent(username)}?tab=overview`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("在 GitHub 编辑")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        )}
      </p>
      <Input
        autoFocus
        prefix={<Search size={16} aria-hidden="true" />}
        aria-label={t("搜索 Repo 和 Gist")}
        aria-describedby={`${id}-note`}
        placeholder={t("搜索名称、所有者或简介")}
        value={query}
        onChange={setQuery}
      />
      <div
        className="gp-pins-filters"
        role="group"
        aria-label={t("筛选置顶类型")}
      >
        <Checkbox checked={showRepos} onChange={setShowRepos}>
          Repo
        </Checkbox>
        <Checkbox checked={showGists} onChange={setShowGists}>
          Gists
        </Checkbox>
        <span role="status" aria-live="polite">
          {t("已选 {{count}} / 6", { count: selected.length })}
        </span>
      </div>
      <div className="gp-pins-choices" aria-busy={resource.loading}>
        {resource.loading && (
          <div role="status">
            <Spin size={14} /> {t("正在加载")}
          </div>
        )}
        {resource.error && (
          <div role="alert">
            <p>{t("置顶候选项未能完整加载，请重试。")}</p>
            <Button size="small" onClick={resource.reload}>
              {t("重试")}
            </Button>
          </div>
        )}
        {!resource.loading && !resource.error && !filtered.length && (
          <p role="status">{t("没有匹配的 Repo 或 Gist")}</p>
        )}
        <ul aria-label={t("置顶候选项")}>
          {filtered.map((item) => {
            const checked = selected.includes(item.id);
            const Icon = item.kind === "repository" ? BookOpen : Code2;
            return (
              <li key={item.id}>
                <Checkbox
                  checked={checked}
                  disabled={saving || (!checked && selected.length >= 6)}
                  onChange={(value) =>
                    setSelected((current) =>
                      value
                        ? current.length < 6
                          ? [...current, item.id]
                          : current
                        : current.filter((pin) => pin !== item.id),
                    )
                  }
                >
                  <span className="gp-pin-choice">
                    <Icon size={16} aria-hidden="true" />
                    <span>
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind === "repository" ? "Repo" : "Gist"}
                        {item.description ? ` · ${item.description}` : ""}
                      </span>
                    </span>
                  </span>
                </Checkbox>
              </li>
            );
          })}
        </ul>
      </div>
      {selected.length === 6 && (
        <p className="gp-pins-note" role="status">
          {t("已达到 6 个置顶上限，请先取消一个选项。")}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}
