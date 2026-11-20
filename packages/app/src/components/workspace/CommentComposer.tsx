import { useState } from "react";
import { Alert, Button, Input } from "@arco-design/web-react";
import { useTranslation } from "../../i18n";
import { useWorkspaceAction } from "../../hooks/useWorkspaceAction";
import {
  useCommentDraft,
  useOnlineStatus,
} from "../../hooks/useOfflineWorkspace";
import {
  collaboration,
  type Discussion,
} from "../../services/github/CollaborationService";
import { TokenManager } from "../../services/auth/TokenManager";
export function CommentComposer({
  repository,
  kind,
  number,
  accountId,
  token,
  onSent,
}: {
  repository: string;
  kind: "issue" | "pull";
  number: number;
  accountId: string | null;
  token: string;
  onSent?: (comment: Discussion) => void;
}) {
  const { t } = useTranslation(),
    online = useOnlineStatus(),
    action = useWorkspaceAction();
  const draft = useCommentDraft(accountId, repository, kind, number);
  const [notice, setNotice] = useState("");
  return (
    <form
      className="gp-work-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!online) return;
        void action.run(async () => {
          if (!accountId || !TokenManager.getAccount(accountId))
            throw new Error("来源账号已移除，请重新添加账号。");
          await draft.flush();
          const [owner, name] = repository.split("/");
          const result = await collaboration.comment(
            owner,
            name,
            number,
            draft.body,
            token,
          );
          setNotice("评论已发送");
          try {
            await draft.clear();
          } catch {
            setNotice("评论已发送，但草稿清理失败，请勿重复发送。");
          }
          onSent?.(result);
        });
      }}
    >
      {!online && (
        <Alert content={t("当前离线，可以继续编辑草稿；联网后请点击发送。")} />
      )}
      <label>
        {t("添加评论")}
        <Input.TextArea
          value={draft.body}
          onChange={draft.change}
          maxLength={65536}
          autoSize={{ minRows: 4, maxRows: 14 }}
          disabled={action.busy}
        />
      </label>
      <p className="gp-work-muted" role="status">
        {t(
          draft.state === "saving"
            ? "正在加密保存草稿…"
            : draft.state === "error"
              ? "草稿保存失败，请重试。"
              : "草稿已在本机加密保存",
        )}
      </p>
      {notice && <Alert type="info" content={t(notice)} />}
      <div className="gp-work-toolbar">
        <Button
          type="primary"
          htmlType="submit"
          disabled={!online || !draft.body.trim() || draft.state === "error"}
          loading={action.busy}
        >
          {t("发送评论")}
        </Button>
        <Button
          onClick={() => void action.run(draft.flush)}
          loading={action.busy}
        >
          {t("保存草稿")}
        </Button>
      </div>
    </form>
  );
}
