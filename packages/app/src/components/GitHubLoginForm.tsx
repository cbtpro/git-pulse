import { useTranslation, i18n } from "../i18n";
import { useEffect, useId, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { getGitHubClientId } from "../services/auth/GitHubDeviceAuth";
import { openGitHubAuthorization } from "../services/auth/GitHubOAuthTransport";
import { Alert, Button, Input, Radio, Spin } from "@arco-design/web-react";
import {
  ArrowUpRight,
  Check,
  Copy,
  GitBranch,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { copyText } from "../utils/clipboard";
import "../styles/auth.css";

interface GitHubLoginFormProps {
  onLoginSuccess?: (token: string) => void;
}

export function GitHubLoginForm({ onLoginSuccess }: GitHubLoginFormProps) {
  const { t } = useTranslation();
  const {
    loginWithToken,
    loginWithGitHub,
    cancelLogin,
    clearError,
    error,
    isLoading,
    authorization,
  } = useAuthStore();
  const [mode, setMode] = useState<"oauth" | "token">("oauth");
  const [token, setToken] = useState("");
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const mounted = useRef(false);
  const wasAuthorizing = useRef(Boolean(authorization));
  const attempt = useRef(0);
  const tokenId = useId();
  const configured = Boolean(getGitHubClientId());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
    };
  }, []);

  useEffect(() => {
    if (authorization) wasAuthorizing.current = true;
    else if (!isLoading && wasAuthorizing.current) {
      wasAuthorizing.current = false;
      const savedToken = useAuthStore.getState().token;
      if (!error && savedToken) onLoginSuccess?.(savedToken);
    }
  }, [authorization, isLoading, error, onLoginSuccess]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (useAuthStore.getState().isLoading) return;
    const currentAttempt = ++attempt.current;
    setBrowserError(null);
    setCopyStatus("idle");
    const success =
      mode === "oauth" ? await loginWithGitHub() : await loginWithToken(token);
    if (!mounted.current || attempt.current !== currentAttempt) return;
    if (success) {
      setToken("");
      if (mode === "oauth" && wasAuthorizing.current) return;
      const savedToken = useAuthStore.getState().token;
      if (savedToken) onLoginSuccess?.(savedToken);
    }
  };

  const openBrowser = async () => {
    if (openingBrowser) return;
    setOpeningBrowser(true);
    setBrowserError(null);
    try {
      await openGitHubAuthorization();
    } catch (error) {
      setBrowserError(
        error instanceof Error
          ? error.message
          : t("无法打开浏览器，请手动访问 https://github.com/login/device"),
      );
    } finally {
      if (mounted.current) setOpeningBrowser(false);
    }
  };

  const copyAuthorizationCode = async () => {
    if (!authorization || copyStatus === "copying") return;
    const currentAttempt = attempt.current;
    setCopyStatus("copying");
    try {
      await copyText(authorization.userCode);
      if (mounted.current && attempt.current === currentAttempt)
        setCopyStatus("copied");
    } catch {
      if (mounted.current && attempt.current === currentAttempt)
        setCopyStatus("error");
    }
  };

  return (
    <div className="gp-login">
      <Radio.Group
        type="button"
        className="gp-login-tabs"
        value={mode}
        disabled={isLoading}
        aria-label={t("登录方式")}
        onChange={(value) => {
          setMode(value);
          setToken("");
          clearError();
          setBrowserError(null);
        }}
      >
        <Radio value="oauth">
          <GitBranch size={16} />
          {t("GitHub 登录")}
        </Radio>
        <Radio value="token">
          <KeyRound size={16} />
          {t("Token 登录")}
        </Radio>
      </Radio.Group>
      {(error || browserError) && (
        <Alert
          type="error"
          content={t(error || browserError || "")}
          role="alert"
        />
      )}
      <form className="gp-login-form" onSubmit={handleSubmit}>
        {mode === "oauth" ? (
          <>
            <p className="gp-login-hint">
              {t("在 GitHub 官网输入账号密码并完成授权，即可连接你的工作台。")}
            </p>
            {!configured && (
              <Alert
                type="warning"
                content={t(
                  "GitHub 登录尚未配置，请联系应用维护者，或使用 Token 登录。",
                )}
              />
            )}
            {authorization ? (
              <div className="gp-authorization">
                <p>{t("在 GitHub 授权页面输入以下验证码")}</p>
                <div className="gp-device-code-row">
                  <strong
                    className="gp-device-code"
                    aria-label={t("授权验证码")}
                  >
                    {authorization.userCode}
                  </strong>
                  <Button
                    htmlType="button"
                    className="gp-copy-code"
                    aria-label={t("复制授权码")}
                    icon={
                      copyStatus === "copied" ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )
                    }
                    loading={copyStatus === "copying"}
                    onClick={copyAuthorizationCode}
                  >
                    {copyStatus === "copied" ? t("已复制") : t("复制")}
                  </Button>
                </div>
                <p
                  className={`gp-copy-feedback${copyStatus === "error" ? " gp-copy-error" : ""}`}
                  role="status"
                >
                  {copyStatus === "copied"
                    ? t("授权码已复制")
                    : copyStatus === "error"
                      ? t("复制失败，请选中授权码后手动复制。")
                      : ""}
                </p>
                <Button
                  type="primary"
                  size="large"
                  long
                  onClick={openBrowser}
                  loading={openingBrowser}
                >
                  {t("打开 GitHub 授权页面")}
                  <ArrowUpRight size={17} />
                </Button>
                <p className="gp-login-hint">
                  {t("github.com/login/device · 有效至 {{time}}", {
                    time: new Date(authorization.expiresAt).toLocaleTimeString(
                      i18n.language,
                      { hour: "2-digit", minute: "2-digit" },
                    ),
                  })}
                </p>
                <div className="gp-authorization-status" role="status">
                  {isLoading && <Spin size={16} />}
                  {isLoading
                    ? t("等待授权，完成后会自动登录…")
                    : t("授权进度已保存，将自动继续登录。")}
                </div>
                {!isLoading && (
                  <Button long onClick={() => void loginWithGitHub()}>
                    {t("重试")}
                  </Button>
                )}
                <Button
                  type="text"
                  long
                  onClick={() => {
                    attempt.current += 1;
                    cancelLogin();
                  }}
                >
                  {t("取消授权")}
                </Button>
              </div>
            ) : (
              <Button
                htmlType="submit"
                type="primary"
                long
                size="large"
                loading={isLoading}
                disabled={isLoading || !configured}
                icon={<GitBranch size={18} />}
              >
                {isLoading ? t("正在连接 GitHub…") : t("使用 GitHub 登录")}
              </Button>
            )}
          </>
        ) : (
          <>
            <label htmlFor={tokenId}>Personal Access Token</label>
            <Input.Password
              id={tokenId}
              value={token}
              autoComplete="off"
              spellCheck={false}
              size="large"
              placeholder={t("输入 GitHub Personal Access Token")}
              disabled={isLoading}
              onChange={(value) => {
                setToken(value);
                clearError();
              }}
            />
            <p className="gp-login-hint">
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("创建 Token")}
                <ArrowUpRight size={13} />
              </a>
              {t("按需授予仓库、通知等权限。")}
            </p>
            <Button
              htmlType="submit"
              type="primary"
              long
              size="large"
              loading={isLoading}
              disabled={isLoading || !token.trim()}
            >
              {isLoading ? t("登录中…") : t("使用 Token 登录")}
            </Button>
          </>
        )}
      </form>
      <p className="gp-login-privacy">
        <ShieldCheck size={17} />
        <span>
          {t("凭证仅保存在本机，用于访问 GitHub。GitPulse 不收集账号密码。")}
        </span>
      </p>
    </div>
  );
}
