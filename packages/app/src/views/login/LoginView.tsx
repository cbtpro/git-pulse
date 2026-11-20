import { useTranslation } from "../../i18n";
import { Button, Card } from "@arco-design/web-react";
import { X } from "lucide-react";
import { GitHubLoginForm } from "../../components/GitHubLoginForm";
import { Brand } from "../../components/common/Brand";
import "../../styles/auth.css";

export interface LoginViewProps {
  onLoginSuccess: (token: string) => void;
  onClose?: () => void;
}
export function LoginView({ onLoginSuccess, onClose }: LoginViewProps) {
  const { t } = useTranslation();
  return (
    <div className="gp-login-page">
      <Card className="gp-login-page-card">
        {onClose && (
          <Button
            className="gp-login-close"
            type="text"
            aria-label={t("关闭登录")}
            icon={<X size={20} />}
            onClick={onClose}
          />
        )}
        <Brand />
        <h1>{t("连接你的 GitHub")}</h1>
        <p className="gp-login-subtitle">
          {t("探索项目，关注协作，找到你的开源节奏。")}
        </p>
        <GitHubLoginForm onLoginSuccess={onLoginSuccess} />
      </Card>
    </div>
  );
}
