import { Alert, Avatar, Button, Card, Tag } from "@arco-design/web-react";
import {
  ArrowRightLeft,
  GitBranch,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/authStore";

export function AccountSettingsCard({
  onShowLogin,
}: {
  onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const {
    accounts,
    activeAccountId,
    isLoggedIn,
    isLoading,
    error,
    switchAccount,
    removeAccount,
    clearError,
  } = useAuthStore();
  return (
    <Card className="gp-settings-card gp-accounts-card">
      <div className="gp-accounts-heading">
        <div className="gp-card-title">
          <GitBranch size={20} />
          <h2>{t("GitHub 账号")}</h2>
        </div>
        <Button
          type="primary"
          icon={<UserPlus size={16} />}
          disabled={isLoading}
          onClick={onShowLogin}
        >
          {t("添加账号")}
        </Button>
      </div>
      <p className="gp-accounts-description">
        {t("添加多个 GitHub 账号，切换后显示对应账号的内容。")}
        {isLoggedIn && (
          <> {t("使用同一账号重新登录可更新授权，无需移除账号。")}</>
        )}
      </p>
      {error && (
        <Alert type="error" content={t(error)} closable onClose={clearError} />
      )}
      {accounts.length ? (
        <ul className="gp-account-list" aria-label={t("已保存的账号")}>
          {accounts.map((account) => {
            const current = isLoggedIn && account.id === activeAccountId;
            return (
              <li className="gp-saved-account" key={account.id}>
                <Avatar size={48} className="gp-settings-avatar">
                  {account.profile?.avatar_url ? (
                    <img src={account.profile.avatar_url} alt="" />
                  ) : (
                    account.username.slice(0, 1).toUpperCase()
                  )}
                </Avatar>
                <div className="gp-saved-account-info">
                  <strong>{account.profile?.name || account.username}</strong>
                  <span>@{account.username}</span>
                  <small>
                    {account.mode === "oauth"
                      ? t("GitHub 浏览器授权")
                      : "Personal Access Token"}
                  </small>
                </div>
                <div className="gp-saved-account-actions">
                  {current ? (
                    <>
                      <Tag color="green">{t("当前账号")}</Tag>
                      <Button
                        type="text"
                        icon={<RefreshCw size={15} />}
                        disabled={isLoading}
                        onClick={onShowLogin}
                      >
                        {t("更新授权")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      icon={<ArrowRightLeft size={15} />}
                      disabled={isLoading}
                      onClick={() => void switchAccount(account.id)}
                      aria-label={t("切换到 {{username}}", {
                        username: account.username,
                      })}
                    >
                      {t("切换账号")}
                    </Button>
                  )}
                  <Button
                    type="text"
                    status="danger"
                    icon={current ? <LogOut size={15} /> : <Trash2 size={15} />}
                    disabled={isLoading}
                    onClick={() => void removeAccount(account.id)}
                    aria-label={t("移除账号 {{username}}", {
                      username: account.username,
                    })}
                  >
                    {current ? t("退出登录") : t("移除")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="gp-account-empty">{t("尚未连接账号")}</p>
      )}
      <p className="gp-account-security">
        <ShieldCheck size={16} />
        <span>
          {t(
            "登录凭证与个人资料加密保存在当前设备。移除账号会删除其本地登录信息，保留其他账号与外观偏好。",
          )}
        </span>
      </p>
    </Card>
  );
}
