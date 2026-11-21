import { useTranslation } from "../i18n";
import { Button, Modal } from "@arco-design/web-react";
import { X } from "lucide-react";
import { GitHubLoginForm } from "./GitHubLoginForm";
import { Brand } from "./common/Brand";
import { useAuthStore } from "../stores/authStore";
import { useBackDismiss } from "../hooks/useMobileNavigation";
import "../styles/auth.css";

export function LoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const close = () => {
    useAuthStore.getState().cancelLogin();
    useAuthStore.getState().clearError();
    onClose();
  };
  useBackDismiss(isOpen, close);
  return (
    <Modal
      visible={isOpen}
      onCancel={close}
      footer={null}
      title={<span className="gp-sr-only">{t("登录 GitPulse")}</span>}
      closable={false}
      maskClosable={false}
      unmountOnExit
      className="gp-login-modal"
      style={{ width: 460 }}
    >
      <Button
        className="gp-login-close"
        type="text"
        shape="circle"
        aria-label={t("关闭登录")}
        icon={<X size={20} />}
        onClick={close}
      />
      <Brand />
      <h2>{t("连接你的 GitHub")}</h2>
      <p className="gp-login-subtitle">{t("项目探索，从这里变得更有条理。")}</p>
      {isOpen && <GitHubLoginForm onLoginSuccess={close} />}
    </Modal>
  );
}
