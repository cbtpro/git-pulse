import { startContributionWidgetSync } from "./services/widgets/WidgetService";
import { useTranslation } from "./i18n";
import { useEffect, useState } from "react";
import { ConfigProvider, Spin } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
import zhTW from "@arco-design/web-react/es/locale/zh-TW";
import enUS from "@arco-design/web-react/es/locale/en-US";
import jaJP from "@arco-design/web-react/es/locale/ja-JP";
import { usePreferencesStore } from "./stores/preferencesStore";
import { HashRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginModal } from "./components/LoginModal";
import { Brand } from "./components/common/Brand";
import { useAuthStore } from "./stores/authStore";
import { pendingGitHubAuthorization } from "./services/auth/GitHubDeviceAuth";
import { useMobileViewport } from "./hooks/useMobileViewport";
import { useAppearance } from "./hooks/useAppearance";
import "./App.css";

export function App() {
  useMobileViewport();
  const { t } = useTranslation();
  const language = usePreferencesStore((state) => state.language);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const authorization = useAuthStore((state) => state.authorization);
  const [showLogin, setShowLogin] = useState(false);
  const [ready, setReady] = useState(false);
  const { density } = useAppearance();
  useEffect(() => {
    let active = true;
    checkAuth().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [checkAuth]);
  useEffect(() => {
    const resume = () => {
      if (!ready || document.visibilityState === "hidden") return;
      const auth = useAuthStore.getState();
      if (!auth.isLoading && pendingGitHubAuthorization())
        void auth.loginWithGitHub();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [ready]);
  useEffect(() => {
    if (ready) return startContributionWidgetSync();
  }, [ready]);
  return (
    <ConfigProvider
      locale={{ "zh-CN": zhCN, "zh-TW": zhTW, en: enUS, ja: jaJP }[language]}
      size={density === "compact" ? "small" : "default"}
    >
      {!ready ? (
        <div className="gp-startup">
          <Brand />
          <Spin tip={t("正在恢复你的工作台…")} />
        </div>
      ) : (
        <HashRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AppLayout onShowLogin={() => setShowLogin(true)} />
          <LoginModal
            isOpen={showLogin || Boolean(authorization)}
            onClose={() => setShowLogin(false)}
          />
        </HashRouter>
      )}
    </ConfigProvider>
  );
}
